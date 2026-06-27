import { getSettings, saveSettings, getBookmarks, saveBookmarks } from "./state.js"
import { showToast } from "../utils/toast.js"
import { showFileSelector, showChoice } from "../utils/dialog.js"

// Default name of the file to save to Google Drive
const DEFAULT_SYNC_FILE_NAME = "startpage_backup.json"

export const DriveSync = {
  isEnabled: false,
  isSyncing: false,

  getSyncFileName() {
    const settings = getSettings();
    return settings.driveSyncFileName || DEFAULT_SYNC_FILE_NAME;
  },

  async init() {
    const settings = await getSettings()
    this.isEnabled = settings.googleDriveSync === true

    window.addEventListener('googleProfileUpdated', (e) => {
      this.updateSyncStatusUI(e.detail)
    })

    try {
      const cached = localStorage.getItem('googleUserProfile')
      if (cached && this.isEnabled) {
        this.updateSyncStatusUI(JSON.parse(cached))
      } else {
        this.updateSyncStatusUI(null)
      }
    } catch(e) {}

    if (this.isEnabled) {
      const intervalStr = settings.driveAutoBackupInterval;
      let shouldBackup = false;
      if (intervalStr && intervalStr !== "none") {
        const lastBackup = settings.lastDriveBackupTime || 0;
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        if (intervalStr === "daily" && now - lastBackup > DAY) shouldBackup = true;
        if (intervalStr === "weekly" && now - lastBackup > 7 * DAY) shouldBackup = true;
        if (intervalStr === "monthly" && now - lastBackup > 30 * DAY) shouldBackup = true;
      }

      if (shouldBackup) {
        this.syncToDrive().then(() => {
          const currentSettings = getSettings()
          currentSettings.lastDriveBackupTime = Date.now()
          saveSettings(true)
        });
      } else {
        this.syncFromDrive()
      }
    }
  },

  async toggleSync(enabled, buildPayloadFn = null) {
    if (enabled) {
      try {
        const token = await this.getAuthToken(true)
        if (token) {
          const settings = getSettings()
          let defaultName = settings.driveSyncFileName || DEFAULT_SYNC_FILE_NAME

          const files = await this.getAllJsonFiles(token)
          const fileName = await showFileSelector("Select Sync Backup File", files, defaultName)
          
          if (!fileName) {
            throw new Error("User cancelled sync setup")
          }

          const finalFileName = fileName.trim().toLowerCase().endsWith(".json") ? fileName.trim() : `${fileName.trim()}.json`
          settings.driveSyncFileName = finalFileName
          
          this.isEnabled = true
          this.updateUserProfile(token)
          
          const fileId = await this.getFileId(token)

          if (fileId) {
            const choice = await showChoice(
              `Backup file "${finalFileName}" already exists on Google Drive. Do you want to download settings from Drive, or overwrite it with your current settings?`,
              "Drive Backup Found",
              [
                { label: "Download from Drive", value: "download", primary: true, icon: "fa-solid fa-cloud-arrow-down" },
                { label: "Overwrite Drive", value: "upload", danger: true, icon: "fa-solid fa-cloud-arrow-up" },
                { label: "Cancel", value: "cancel" }
              ]
            )

            if (!choice || choice === "cancel") {
              throw new Error("User cancelled sync setup")
            }

            if (choice === "upload" && buildPayloadFn) {
              const payload = await buildPayloadFn()
              if (!payload) throw new Error("Cancelled sync payload")
              settings.googleDriveSync = true
              saveSettings(true)
              showToast("Google Drive Sync Enabled!", "success")
              await this.syncToDrive(payload)
            } else if (choice === "download") {
              settings.googleDriveSync = true
              saveSettings(true)
              showToast("Google Drive Sync Enabled!", "success")
              await this.syncFromDrive(true)
            }
          } else {
            let payload = null;
            if (buildPayloadFn) {
              payload = await buildPayloadFn()
              if (!payload) throw new Error("Cancelled sync payload")
            }
            settings.googleDriveSync = true
            saveSettings(true)
            showToast("Google Drive Sync Enabled!", "success")
            await this.syncToDrive(payload)
          }
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
      this.clearUserProfile()
      const settings = getSettings()
      settings.googleDriveSync = false
      saveSettings(true)
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

  async getAllJsonFiles(token) {
    const query = encodeURIComponent(`mimeType='application/json' and trashed=false`)
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) return []
      const data = await response.json()
      return data.files || []
    } catch(e) {
      return []
    }
  },

  async getFileId(token) {
    const query = encodeURIComponent(`name='${this.getSyncFileName()}' and trashed=false`)
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

  async syncToDrive(payload = null) {
    if (!this.isEnabled || this.isSyncing) return
    this.isSyncing = true

    try {
      const token = await this.getAuthToken(false)
      const fileId = await this.getFileId(token)

      let dataToSave = payload;
      if (!dataToSave) {
        const settings = await getSettings()
        const bookmarks = await getBookmarks()
        dataToSave = { settings, bookmarks }
      } else if (fileId) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (response.ok) {
            const existingData = await response.json()
            dataToSave = { ...existingData, ...payload }
          }
        } catch (e) {
          console.error("Failed to fetch existing data for merge", e)
        }
      }

      const fileContent = JSON.stringify(dataToSave)
      const metadata = {
        name: this.getSyncFileName(),
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
      
      const currentSettings = await getSettings();
      currentSettings.lastDriveBackupTime = Date.now();
      await saveSettings(true);
    } catch (error) {
      console.error("Drive Sync Upload Error:", error)
    } finally {
      this.isSyncing = false
    }
  },

  async syncFromDrive(isManual = false) {
    if (!this.isEnabled || this.isSyncing) return
    this.isSyncing = true

    try {
      const token = await this.getAuthToken(false)
      this.updateUserProfile(token)
      const fileId = await this.getFileId(token)

      if (fileId) {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!response.ok) throw new Error("Failed to download file")
        let data = await response.json()
        
        // --- VALIDATION (Similar to importSettingsData) ---
        if (Array.isArray(data)) {
          data = { source: "zero-startpage", version: 2, bookmarks: data }
        } else if (typeof data === "object") {
          const hasMainSection = data.settings || data.bookmarks || data.todos || data.notepad || data.calendarEvents || data.media
          if (!hasMainSection) {
            data = { source: "zero-startpage", version: 2, settings: data }
          }
        }
        
        const isStartpageFile = data && (data.source === "zero-startpage" || data.version !== undefined || data.settings || data.bookmarks || data.todos)
        
        if (!isStartpageFile) {
          throw new Error("Downloaded file is not a valid Startpage settings file.")
        }
        // ------------------------------------------------

        if (isManual && window.importSettingsData) {
          await window.importSettingsData(data)
        } else {
          if (data.settings) {
            // Merge with current settings but keep sync enabled
            const currentSettings = getSettings()
            Object.assign(currentSettings, data.settings)
            currentSettings.googleDriveSync = true
            saveSettings(true)
          }
          if (data.bookmarks) {
            await saveBookmarks(data.bookmarks)
          }
        }
        
        console.log("Successfully synced from Google Drive")
      }
    } catch (error) {
      console.error("Drive Sync Download Error:", error)
      if (isManual) {
        throw error
      }
    } finally {
      this.isSyncing = false
    }
  },

  async updateUserProfile(token) {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const userInfo = await response.json()
        localStorage.setItem('googleUserProfile', JSON.stringify(userInfo))
        window.dispatchEvent(new CustomEvent('googleProfileUpdated', { detail: userInfo }))
      }
    } catch (e) {
      console.error("Failed to fetch user profile", e)
    }
  },

  clearUserProfile() {
    localStorage.removeItem('googleUserProfile')
    window.dispatchEvent(new CustomEvent('googleProfileUpdated', { detail: null }))
  },

  updateSyncStatusUI(userInfo) {
    const statusDiv = document.getElementById("google-drive-sync-status")
    const avatarImg = document.getElementById("google-sync-avatar")
    const emailSpan = document.getElementById("google-sync-email")
    if (userInfo && this.isEnabled) {
      if (statusDiv) statusDiv.style.display = "flex"
      if (avatarImg) avatarImg.src = userInfo.picture || ""
      if (emailSpan) emailSpan.textContent = userInfo.email || "Logged in"
    } else {
      if (statusDiv) statusDiv.style.display = "none"
    }
  }
}
