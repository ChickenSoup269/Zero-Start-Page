import { getSettings, saveSettings, getBookmarks, saveBookmarks } from "./state.js"
import { showToast } from "../utils/toast.js"

// The name of the file to save to Google Drive
const SYNC_FILE_NAME = "startpage_backup.json"

export const DriveSync = {
  isEnabled: false,
  isSyncing: false,

  async init() {
    const settings = await getSettings()
    this.isEnabled = settings.googleDriveSync === true

    if (this.isEnabled) {
      // If enabled, auto-sync on load
      this.syncFromDrive()
    }
  },

  async toggleSync(enabled) {
    if (enabled) {
      try {
        const token = await this.getAuthToken(true)
        if (token) {
          this.isEnabled = true
          this.updateUserAvatar(token)
          await saveSettings({ googleDriveSync: true })
          showToast("Google Drive Sync Enabled!", "success")
          // Sync immediately when turned on
          await this.syncToDrive()
        } else {
          throw new Error("No token returned")
        }
      } catch (error) {
        console.error("Failed to enable Drive Sync:", error)
        showToast("Failed to connect to Google Drive", "error")
        this.isEnabled = false
        await saveSettings({ googleDriveSync: false })
        throw error
      }
    } else {
      this.isEnabled = false
      await saveSettings({ googleDriveSync: false })
      showToast("Google Drive Sync Disabled")
    }
  },

  getAuthToken(interactive = false) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
        return reject(new Error("chrome.identity API is not available. Please ensure the extension is loaded in Chrome and the 'identity' permission is set."));
      }
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(token)
        }
      })
    })
  },

  async getFileId(token) {
    const query = encodeURIComponent(`name='${SYNC_FILE_NAME}' and trashed=false`)
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.ok) throw new Error("Failed to search Drive")
    const data = await response.json()
    if (data.files && data.files.length > 0) {
      return data.files[0].id
    }
    return null
  },

  async syncToDrive() {
    if (!this.isEnabled || this.isSyncing) return
    this.isSyncing = true

    try {
      const token = await this.getAuthToken(false)
      const fileId = await this.getFileId(token)

      const settings = await getSettings()
      const bookmarks = await getBookmarks()
      const dataToSave = { settings, bookmarks }
      const fileContent = JSON.stringify(dataToSave)
      const metadata = {
        name: SYNC_FILE_NAME,
        mimeType: "application/json",
      }

      const form = new FormData()
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
      form.append("file", new Blob([fileContent], { type: "application/json" }))

      let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
      let method = "POST"

      if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        method = "PATCH"
      }

      const response = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (!response.ok) throw new Error("Failed to upload")
      console.log("Successfully synced to Google Drive")
    } catch (error) {
      console.error("Drive Sync Upload Error:", error)
    } finally {
      this.isSyncing = false
    }
  },

  async syncFromDrive() {
    if (!this.isEnabled || this.isSyncing) return
    this.isSyncing = true

    try {
      const token = await this.getAuthToken(false)
      this.updateUserAvatar(token)
      const fileId = await this.getFileId(token)

      if (fileId) {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!response.ok) throw new Error("Failed to download file")
        const data = await response.json()
        
        if (data.settings) {
          // Merge with current settings but keep sync enabled
          data.settings.googleDriveSync = true
          await saveSettings(data.settings)
        }
        if (data.bookmarks) {
          await saveBookmarks(data.bookmarks)
        }
        
        console.log("Successfully synced from Google Drive")
        // Reload page to apply new settings if we just restored them on startup
        // It's better to let the user know, or silently reload.
        // If we do this on page load, we can reload.
      }
    } catch (error) {
      console.error("Drive Sync Download Error:", error)
    } finally {
      this.isSyncing = false
    }
  },

  async updateUserAvatar(token) {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const userInfo = await response.json()
        const avatarImg = document.getElementById("google-user-avatar")
        if (avatarImg && userInfo.picture) {
          avatarImg.src = userInfo.picture
          avatarImg.title = userInfo.name || userInfo.email || "Google Account"
        }
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e)
    }
  }
}
