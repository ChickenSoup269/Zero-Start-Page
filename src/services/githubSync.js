/**
 * GitHub Gist Sync Service
 * Allows users to sync settings and bookmarks to a secret GitHub Gist using a Personal Access Token (PAT).
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

const DEFAULT_GIST_FILE_NAME = "startpage_backup.json"
const GIST_DESCRIPTION = "Zero Start Page Backup & Sync (Secret Gist)"

export const GitHubSync = {
  isEnabled: false,
  isSyncing: false,

  getToken() {
    const settings = getSettings()
    return (settings.githubSyncToken || "").trim()
  },

  getGistId() {
    const settings = getSettings()
    return (settings.githubSyncGistId || "").trim()
  },

  getSyncFileName() {
    const settings = getSettings()
    return settings.githubSyncFileName || DEFAULT_GIST_FILE_NAME
  },

  async init() {
    const settings = await getSettings()
    this.isEnabled = settings.githubSync === true && Boolean(this.getToken())

    window.addEventListener("githubProfileUpdated", (e) => {
      this.updateSyncStatusUI(e.detail)
    })

    try {
      const cached = localStorage.getItem("githubUserProfile")
      if (cached && this.isEnabled) {
        this.updateSyncStatusUI(JSON.parse(cached))
      } else {
        this.updateSyncStatusUI(null)
      }
    } catch (e) {}

    if (this.isEnabled) {
      const intervalStr = settings.githubAutoBackupInterval
      let shouldBackup = false
      if (intervalStr && intervalStr !== "none") {
        const lastBackup = settings.lastGithubBackupTime || 0
        const now = Date.now()
        const DAY = 24 * 60 * 60 * 1000
        if (intervalStr === "daily" && now - lastBackup > DAY) shouldBackup = true
        if (intervalStr === "weekly" && now - lastBackup > 7 * DAY) shouldBackup = true
        if (intervalStr === "monthly" && now - lastBackup > 30 * DAY) shouldBackup = true
      }

      if (shouldBackup) {
        this.syncToGist().then(() => {
          const currentSettings = getSettings()
          currentSettings.lastGithubBackupTime = Date.now()
          saveSettings(true)
        })
      }
    }
  },

  /**
   * Verify token by fetching user profile
   */
  async verifyToken(token) {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || `GitHub authentication failed (${res.status})`)
    }
    const user = await res.json()
    return user
  },

  /**
   * Enable or disable GitHub sync
   */
  async toggleSync(enabled, buildPayloadFn = null) {
    const i18n = geti18n()
    const settings = getSettings()

    if (enabled) {
      const token = this.getToken()
      if (!token) {
        showToast(
          i18n.toast_github_token_required || "Please enter a GitHub Personal Access Token first.",
          { type: "warning" },
        )
        this.isEnabled = false
        settings.githubSync = false
        saveSettings(true)
        throw new Error("No token provided")
      }

      try {
        const user = await this.verifyToken(token)
        localStorage.setItem("githubUserProfile", JSON.stringify(user))
        window.dispatchEvent(
          new CustomEvent("githubProfileUpdated", { detail: user }),
        )

        this.isEnabled = true
        settings.githubSync = true

        let gistId = this.getGistId()
        let gistExists = false

        if (gistId) {
          try {
            const existingGist = await this.getGist(token, gistId)
            if (existingGist && existingGist.files) {
              gistExists = true
            }
          } catch (e) {
            console.warn("Existing Gist not found or inaccessible:", e)
            gistId = ""
            settings.githubSyncGistId = ""
          }
        }

        let payload = null
        if (buildPayloadFn) {
          payload = await buildPayloadFn()
        }

        if (gistExists) {
          const choice = await showChoice(
            i18n.dialog_github_existing_gist_choice ||
              `Backup found in Gist (${gistId}). Do you want to download settings from GitHub, or overwrite it with your current settings?`,
            "GitHub Sync",
            i18n.settings_force_drive_download || "Download",
            i18n.settings_force_drive_sync || "Upload",
          )

          if (choice === "left") {
            await this.syncFromGist(true)
          } else if (choice === "right") {
            await this.syncToGist(payload)
          }
        } else {
          // Create new secret gist
          await this.syncToGist(payload)
        }

        saveSettings(true)
        showToast(
          i18n.toast_github_enabled || "GitHub Gist Sync Enabled!",
          { type: "success" },
        )
      } catch (err) {
        console.error("Failed to enable GitHub Sync:", err)
        showToast(
          `${i18n.toast_github_failed || "GitHub sync connection failed"}: ${err.message}`,
          { type: "error" },
        )
        this.isEnabled = false
        settings.githubSync = false
        saveSettings(true)
        throw err
      }
    } else {
      this.isEnabled = false
      this.clearUserProfile()
      settings.githubSync = false
      saveSettings(true)
      showToast(
        i18n.toast_github_disabled || "GitHub Gist Sync Disabled",
        { type: "info" },
      )
    }
  },

  async getGist(token, gistId) {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    if (!res.ok) throw new Error(`Gist fetch error (${res.status})`)
    return await res.json()
  },

  /**
   * Upload / Save backup to GitHub Gist
   */
  async syncToGist(payload = null) {
    const token = this.getToken()
    if (!token) throw new Error("GitHub token is missing")

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
      let gistId = this.getGistId()

      const filesObj = {
        [fileName]: {
          content: fileContent,
        },
      }

      let res
      if (gistId) {
        // Update existing Gist
        res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            description: GIST_DESCRIPTION,
            files: filesObj,
          }),
        })
      } else {
        // Create new secret Gist
        res = await fetch("https://api.github.com/gists", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            description: GIST_DESCRIPTION,
            public: false, // Secret Gist
            files: filesObj,
          }),
        })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `Gist save error (${res.status})`)
      }

      const gistData = await res.json()
      const currentSettings = getSettings()
      currentSettings.githubSyncGistId = gistData.id
      currentSettings.lastGithubBackupTime = Date.now()
      saveSettings(true)

      const gistInput = document.getElementById("github-sync-gist-id-input")
      if (gistInput) gistInput.value = gistData.id

      console.log("Successfully synced to GitHub Gist:", gistData.id)
      const i18n = geti18n()
      showToast(i18n.toast_github_upload_success || "Backup uploaded to GitHub Gist!", { type: "success" })
    } catch (err) {
      console.error("GitHub Gist Upload Error:", err)
      const i18n = geti18n()
      showToast(`${i18n.toast_github_upload_error || "Failed to upload to GitHub Gist"}: ${err.message}`, { type: "error" })
      throw err
    } finally {
      this.isSyncing = false
    }
  },

  /**
   * Download / Restore backup from GitHub Gist
   */
  async syncFromGist(isManual = false) {
    const token = this.getToken()
    const gistId = this.getGistId()
    if (!token) throw new Error("GitHub token is missing")
    if (!gistId) throw new Error("Gist ID is missing. Please upload first or enter an existing Gist ID.")

    this.isSyncing = true
    try {
      const gistData = await this.getGist(token, gistId)
      const fileName = this.getSyncFileName()

      let targetFile = gistData.files?.[fileName]
      if (!targetFile) {
        // Fallback: pick the first .json file in the Gist
        const fileKeys = Object.keys(gistData.files || {})
        const jsonKey = fileKeys.find((k) => k.endsWith(".json")) || fileKeys[0]
        if (jsonKey) targetFile = gistData.files[jsonKey]
      }

      if (!targetFile || !targetFile.content) {
        throw new Error("No valid backup file found inside this Gist.")
      }

      let data = JSON.parse(targetFile.content)

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
        throw new Error("Gist content is not a valid Startpage backup file.")
      }

      if (isManual && window.importSettingsData) {
        await window.importSettingsData(data)
      } else {
        if (data.settings) {
          const currentSettings = getSettings()
          Object.assign(currentSettings, data.settings)
          currentSettings.githubSync = true
          currentSettings.githubSyncToken = token
          currentSettings.githubSyncGistId = gistId
          saveSettings(true)
        }
        if (data.bookmarks) {
          await saveBookmarks(data.bookmarks)
        }
      }

      console.log("Successfully synced from GitHub Gist")
      const i18n = geti18n()
      showToast(i18n.toast_github_download_success || "Backup restored from GitHub Gist!", { type: "success" })
    } catch (err) {
      console.error("GitHub Gist Download Error:", err)
      const i18n = geti18n()
      showToast(`${i18n.toast_github_download_error || "Failed to download from GitHub Gist"}: ${err.message}`, { type: "error" })
      if (isManual) throw err
    } finally {
      this.isSyncing = false
    }
  },

  clearUserProfile() {
    localStorage.removeItem("githubUserProfile")
    window.dispatchEvent(
      new CustomEvent("githubProfileUpdated", { detail: null }),
    )
  },

  updateSyncStatusUI(userInfo) {
    const statusDiv = document.getElementById("github-sync-status")
    const avatarImg = document.getElementById("github-sync-avatar")
    const usernameSpan = document.getElementById("github-sync-username")
    if (userInfo && this.isEnabled) {
      if (statusDiv) statusDiv.style.display = "flex"
      if (avatarImg) avatarImg.src = userInfo.avatar_url || ""
      if (usernameSpan) usernameSpan.textContent = userInfo.login || userInfo.name || "Connected"
    } else {
      if (statusDiv) statusDiv.style.display = "none"
    }
  },
}
