import { runLegacyControlMediaTab, getMediaFromTab } from "./src/background/legacyMediaScraper.js"

// console.log("Background script loaded") // For debugging

// Setup Side Panel to open when the extension icon is clicked based on user setting
chrome.storage.local.get(["actionBehavior"], (data) => {
  const behavior = data.actionBehavior || "sidepanel"
  if (chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: behavior === "sidepanel" })
      .catch(() => {})
  }
})

const UNINSTALL_LANGUAGE_KEY = "uninstallSurveyLanguage"
const UNINSTALL_FORM_URLS = {
  vi: "https://docs.google.com/forms/d/e/1FAIpQLScSBZfT8rsgt9C1Xc2bFb0bM9wN-l9-NyDvY5bqBHog25ZAIw/viewform?usp=publish-editor",
  default:
    "https://docs.google.com/forms/d/e/1FAIpQLSe0Amugpqf_TilWUYCuZsBP0p9Hwi1neyoXB5YbpK_-67o89A/viewform?usp=dialog",
}
const KNOWN_MEDIA_TAB_CACHE_TTL = 60_000
let lastKnownMediaTabId = null
let lastKnownMediaTabSeenAt = 0
const mediaStates = {}

function getUninstallUrl(language = "en") {
  return language === "vi"
    ? UNINSTALL_FORM_URLS.vi
    : UNINSTALL_FORM_URLS.default
}

function setLocalizedUninstallUrl(language = "en") {
  const uninstallUrl = getUninstallUrl(language)

  chrome.runtime.setUninstallURL(uninstallUrl, () => {
    if (chrome.runtime.lastError) {
      // console.error("Error setting uninstall URL:", chrome.runtime.lastError)
    } else {
      // console.log("Uninstall URL set successfully:", uninstallUrl)
    }
  })
}

function restoreUninstallUrlFromStorage() {
  chrome.storage.local.get([UNINSTALL_LANGUAGE_KEY], (data) => {
    setLocalizedUninstallUrl(data?.[UNINSTALL_LANGUAGE_KEY] || "en")
  })
}

function openStartpageTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0]
    const startpageUrl = chrome.runtime.getURL("index.html")
    if (
      activeTab &&
      (activeTab.url === "chrome://newtab/" ||
        activeTab.url === "about:blank" ||
        !activeTab.url ||
        activeTab.url.startsWith("chrome://new-tab-page"))
    ) {
      chrome.tabs.update(activeTab.id, { url: startpageUrl })
    } else {
      chrome.tabs.create({ url: startpageUrl })
    }
  })
}

const NEW_TAB_URL = chrome.runtime.getURL("index.html")
const EXTENSION_PREFIX = `chrome-extension://${chrome.runtime.id}`
const rescuedTabs = new Set()

// Hàm xử lý "hồi sinh" tab lỗi
function rescueZombieTab(tab) {
  if (!tab || !tab.id) return

  // Chỉ kiểm tra khi tab đã báo complete (kể cả lỗi ERR_INVALID_URL thì status cũng là complete)
  // Điều này tránh việc đụng chạm nhầm các tab đang tải bình thường.
  if (tab.status !== "complete") return
  if (rescuedTabs.has(tab.id)) return

  const currentUrl = tab.url || ""
  const currentPendingUrl = tab.pendingUrl || ""

  const isOurUrl = (url) => url && url.startsWith(EXTENSION_PREFIX)
  const isStartpageUrl = isOurUrl(currentPendingUrl) || isOurUrl(currentUrl)
  const isLiteralNewTab =
    currentUrl === "chrome://newtab/" ||
    currentPendingUrl === "chrome://newtab/"
  // Tab lỗi thường có URL là rỗng (do bị Chrome chặn) hoặc chứa URL của extension nhưng không load được.
  const isEmptyNewTab = !tab.url && !tab.pendingUrl

  if (isStartpageUrl || isEmptyNewTab || isLiteralNewTab) {
    // Chỉ coi là zombie tab nếu title chứa thông báo lỗi crash / mất kết nối thực sự
    const tabTitle = (tab.title || "").toLowerCase()
    const isZombieTitle =
      tabTitle.includes("site can't be reached") ||
      tabTitle.includes("không thể truy cập") ||
      tabTitle.includes("không thể kết nối") ||
      tabTitle.includes("err_") ||
      tabTitle === "chrome://newtab/" ||
      (tabTitle.includes("chrome-extension://") &&
        (tabTitle.includes("err") ||
          tabTitle.includes("error") ||
          tabTitle.includes("failed") ||
          tabTitle.includes("invalid") ||
          tabTitle.includes("crashed")))

    if (isZombieTitle) {
      rescuedTabs.add(tab.id) // Chỉ thử 1 lần mỗi tab để tránh loop

      // Lập tức đập đi xây lại bằng chrome://newtab/ để giữ thanh địa chỉ sạch đẹp!
      // Vì lúc này extension đã khởi động xong, chrome://newtab/ chắc chắn sẽ load đúng index.html
      chrome.tabs.create(
        {
          url: "chrome://newtab/",
          index: tab.index,
          windowId: tab.windowId,
          active: tab.active,
          pinned: tab.pinned,
        },
        () => {
          chrome.tabs.remove(tab.id, () => {
            const err = chrome.runtime.lastError
          })
        },
      )
    }
  }
}

// 1. Quét diện rộng lúc khởi động
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(rescueZombieTab)
})

function rememberKnownMediaTab(tab) {
  if (!tab?.id || !isKnownMediaTab(tab)) return
  lastKnownMediaTabId = tab.id
  lastKnownMediaTabSeenAt = Date.now()
}

function getRememberedKnownMediaTab(callback) {
  if (
    !lastKnownMediaTabId ||
    Date.now() - lastKnownMediaTabSeenAt > KNOWN_MEDIA_TAB_CACHE_TTL
  ) {
    callback(null)
    return
  }

  chrome.tabs.get(lastKnownMediaTabId, (tab) => {
    if (chrome.runtime.lastError || !isKnownMediaTab(tab)) {
      lastKnownMediaTabId = null
      lastKnownMediaTabSeenAt = 0
      callback(null)
      return
    }
    callback(tab)
  })
}

function clearRememberedKnownMediaTab(tabId = null) {
  if (tabId !== null && tabId !== lastKnownMediaTabId) return
  lastKnownMediaTabId = null
  lastKnownMediaTabSeenAt = 0
}

// Set the uninstall URL and refresh/reload any existing or restored startpage tabs
chrome.runtime.onInstalled.addListener(() => {
  restoreUninstallUrlFromStorage()
})
chrome.runtime.onStartup?.addListener(() => {
  restoreUninstallUrlFromStorage()
})
chrome.action?.onClicked?.addListener((tab) => {
  chrome.storage.local.get(["actionBehavior"], (data) => {
    const behavior = data.actionBehavior || "sidepanel"
    if (behavior === "newtab") {
      openStartpageTab()
    } else if (behavior === "popup") {
      chrome.windows.create({
        url: chrome.runtime.getURL("sidepanel.html"),
        type: "popup",
        width: 450,
        height: 600,
        focused: true,
      })
    }
  })
})
let activeCapturingTabId = null

async function ensureOffscreenDocument() {
  if (!chrome.offscreen) return false
  try {
    const hasDoc = await chrome.offscreen.hasDocument()
    if (hasDoc) return true
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
      justification:
        "Capture media tab audio to compute frequency bands for the music visualizer",
    })
    return true
  } catch (err) {
    console.warn("Failed to create offscreen document:", err)
    return false
  }
}

function isValidCapturableTab(tab) {
  if (!tab || !tab.id || tab.id < 0) return false
  const url = tab.url || tab.pendingUrl || ""
  if (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools://") ||
    url.startsWith("view-source:")
  ) {
    return false
  }
  return isKnownMediaTab(tab)
}

function findAndCaptureActiveMediaTab() {
  if (lastKnownMediaTabId) {
    chrome.tabs.get(lastKnownMediaTabId, (tab) => {
      if (!chrome.runtime.lastError && tab && isValidCapturableTab(tab)) {
        startTabAudioCapture(tab.id)
      } else {
        queryAudibleAndCapture()
      }
    })
    return
  }
  queryAudibleAndCapture()
}

function queryAudibleAndCapture() {
  chrome.tabs.query({ audible: true }, (tabs) => {
    const valid = tabs?.find((t) => isValidCapturableTab(t))
    if (valid) {
      rememberKnownMediaTab(valid)
      startTabAudioCapture(valid.id)
      return
    }
    chrome.tabs.query({}, (allTabs) => {
      const mediaTab = allTabs?.find((t) => isValidCapturableTab(t))
      if (mediaTab) {
        rememberKnownMediaTab(mediaTab)
        startTabAudioCapture(mediaTab.id)
      }
    })
  })
}

async function startTabAudioCapture(tabId) {
  if (!chrome.tabCapture || !tabId) return
  try {
    const tab = await new Promise((resolve) => {
      chrome.tabs.get(tabId, (t) => {
        if (chrome.runtime.lastError || !t) resolve(null)
        else resolve(t)
      })
    })

    if (!isValidCapturableTab(tab)) {
      return
    }

    const offscreenOk = await ensureOffscreenDocument()
    if (!offscreenOk) return

    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      if (chrome.runtime.lastError || !streamId) {
        // Tab capture on background tabs is restricted by Chrome sandbox policy when focused on extension pages
        return
      }
      activeCapturingTabId = tabId
      chrome.runtime
        .sendMessage({
          target: "offscreen",
          type: "START_AUDIO_CAPTURE",
          streamId,
          tabId,
        })
        .catch(() => {})
    })
  } catch (e) {
    console.warn("[Background Audio] startTabAudioCapture error:", e)
  }
}

async function stopTabAudioCapture() {
  activeCapturingTabId = null
  try {
    if (chrome.offscreen && (await chrome.offscreen.hasDocument())) {
      chrome.runtime
        .sendMessage({
          target: "offscreen",
          type: "STOP_AUDIO_CAPTURE",
        })
        .catch(() => {})
    }
  } catch (e) {}
}

async function maybeStartTabAudioCapture(tabId) {
  chrome.storage.local.get(["musicRealAudioReactive"], (data) => {
    if (data.musicRealAudioReactive === true) {
      startTabAudioCapture(tabId)
    }
  })
}

async function maybeStopTabAudioCapture(tabId) {
  if (activeCapturingTabId === tabId) {
    stopTabAudioCapture()
  }
}

chrome.tabs?.onRemoved?.addListener((tabId) => {
  clearRememberedKnownMediaTab(tabId)
  delete mediaStates[tabId]
  if (activeCapturingTabId === tabId) {
    stopTabAudioCapture()
  }
})
function broadcastMediaState(state) {
  if (!state) return
  const extensionPrefix = chrome.runtime.getURL("")
  chrome.tabs.query({}, (tabs) => {
    if (!tabs || chrome.runtime.lastError) return
    tabs.forEach((tab) => {
      const isStartpage =
        tab.url &&
        (tab.url.startsWith(extensionPrefix) ||
          tab.url.includes(chrome.runtime.id) ||
          tab.url.startsWith("chrome://newtab") ||
          tab.url.startsWith("edge://newtab"))
      if (isStartpage) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "mediaStateUpdatedBroadcast",
            state: { audible: true, ...state },
          },
          () => {
            const err = chrome.runtime.lastError
          },
        )
      }
    })
  })
}

chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  // Chỉ kiểm tra cứu tab khi tab đã load xong status = "complete"
  if (changeInfo.status === "complete") {
    rescueZombieTab(tab)
  }

  // 1. Media caching logic
  if (tabId === lastKnownMediaTabId && changeInfo.url) {
    if (!isKnownMediaTab(tab)) clearRememberedKnownMediaTab(tabId)
  }

  // 3. Reactive Media tracking on track change or title change in background tab
  if (
    isKnownMediaTab(tab) &&
    (changeInfo.title || changeInfo.url || changeInfo.audible !== undefined)
  ) {
    getMediaFromTab(tabId, (state) => {
      if (state && (state.title || state.isPlaying)) {
        mediaStates[tabId] = {
          ...state,
          lastUpdated: Date.now(),
        }
        broadcastMediaState(state)
      }
    })
  }
})

// Version update check is now handled in main.js for better reliability

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log("Message received:", request) // For debugging
  if (request.action === "mediaStateUpdated") {
    if (sender.tab && sender.tab.id) {
      mediaStates[sender.tab.id] = {
        ...request.state,
        lastUpdated: Date.now(),
      }

      if (request.state?.isPlaying) {
        maybeStartTabAudioCapture(sender.tab.id)
      } else {
        maybeStopTabAudioCapture(sender.tab.id)
      }

      // Broadcast update to all Startpage tabs
      broadcastMediaState(request.state)
    }
    return
  }

  if (request.action === "startRealAudioCapture") {
    if (!chrome.tabCapture || !chrome.offscreen) {
      chrome.storage.local.set({ musicRealAudioReactive: false })
      sendResponse({ ok: false, error: "tabCapture or offscreen is not supported" })
      return true
    }
    chrome.storage.local.set({ musicRealAudioReactive: true }, () => {
      if (request.tabId) {
        startTabAudioCapture(request.tabId)
      } else {
        findAndCaptureActiveMediaTab()
      }
    })
    sendResponse({ ok: true })
    return true
  }

  if (request.action === "stopRealAudioCapture") {
    chrome.storage.local.set({ musicRealAudioReactive: false }, () => {
      stopTabAudioCapture()
    })
    sendResponse({ ok: true })
    return true
  }

  if (request.action === "updateActionBehavior") {
    const behavior = request.behavior || "sidepanel"
    chrome.storage.local.set({ actionBehavior: behavior }, () => {
      if (chrome.sidePanel) {
        chrome.sidePanel
          .setPanelBehavior({
            openPanelOnActionClick: behavior === "sidepanel",
          })
          .catch(() => {})
      }
      sendResponse({ ok: true })
    })
    return true
  }

  if (request.action === "updateUninstallLanguage") {
    const language = request.language === "vi" ? "vi" : "en"
    chrome.storage.local.set({ [UNINSTALL_LANGUAGE_KEY]: language }, () => {
      setLocalizedUninstallUrl(language)
      sendResponse({ ok: true })
    })
    return true
  }

  if (request.action === "fetchSuggestions") {
    fetch(
      `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(request.query)}`,
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        return response.json()
      })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }))
    return true // Required for async responses
  }

  if (request.action === "getMediaState") {
    chrome.tabs.query({ audible: true }, (tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0]
        rememberKnownMediaTab(tab)
        const cached = mediaStates[tab.id]
        if (cached && Date.now() - (cached.lastUpdated || 0) < 1500) {
          sendResponse({ audible: true, ...cached })
          return
        }
        getMediaFromTab(tab.id, sendResponse)
        return
      }

      getMediaFromAnyKnownTab(sendResponse)
    })
    return true
  }

  if (request.action === "mediaControl") {
    const cmdName =
      typeof request.command === "string"
        ? request.command
        : request.command?.name
    // Invalidate cached state immediately when changing tracks so the next
    // poll always fetches fresh title/artist from the page
    const isTrackChange =
      cmdName === "next" || cmdName === "prev" || cmdName === "playPause"

    chrome.tabs.query({ audible: true }, (tabs) => {
      if (tabs[0]) {
        rememberKnownMediaTab(tabs[0])
        // Clear stale cache so next getMediaState fetches live data
        if (isTrackChange && mediaStates[tabs[0].id]) {
          delete mediaStates[tabs[0].id]
        }
        controlMediaTab(tabs[0].id, request.command, sendResponse)
        return
      }

      controlAnyKnownMediaTab(request.command, sendResponse)
    })
    return true
  }
})

function isKnownMediaTab(tab) {
  return (
    tab?.url?.includes("youtube.com") ||
    tab?.url?.includes("spotify.com") ||
    tab?.url?.includes("zingmp3.vn") ||
    tab?.url?.includes("mp3.zing.vn") ||
    tab?.url?.includes("soundcloud.com") ||
    tab?.url?.includes("music.apple.com") ||
    tab?.url?.includes("nhaccuatui.com") ||
    tab?.url?.includes("nct.vn") ||
    tab?.url?.includes("music.youtube.com")
  )
}

function getKnownMediaTabPriority(tab, preferredSource = "") {
  const url = tab?.url || ""
  if (preferredSource === "spotify" && url.includes("spotify.com")) return 100
  if (tab?.audible) return 90
  if (url.includes("spotify.com")) return 80
  if (url.includes("music.youtube.com")) return 70
  if (url.includes("youtube.com")) return 60
  if (url.includes("music.apple.com")) return 50
  if (url.includes("soundcloud.com")) return 40
  if (url.includes("zingmp3.vn") || url.includes("mp3.zing.vn")) return 30
  if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) return 20
  return 0
}

function getMediaFromAnyKnownTab(sendResponse) {
  getRememberedKnownMediaTab((cachedTab) => {
    if (cachedTab) {
      const cached = mediaStates[cachedTab.id]
      if (cached && Date.now() - (cached.lastUpdated || 0) < 1500) {
        sendResponse({ audible: true, ...cached })
        return
      }
      getMediaFromTab(cachedTab.id, sendResponse)
      return
    }

    chrome.tabs.query({}, (allTabs) => {
      const tab = allTabs
        .filter(isKnownMediaTab)
        .sort(
          (a, b) => getKnownMediaTabPriority(b) - getKnownMediaTabPriority(a),
        )[0]
      if (tab) {
        rememberKnownMediaTab(tab)
        const cached = mediaStates[tab.id]
        if (cached && Date.now() - (cached.lastUpdated || 0) < 1500) {
          sendResponse({ audible: true, ...cached })
          return
        }
        getMediaFromTab(tab.id, sendResponse)
      } else {
        sendResponse({ audible: false })
      }
    })
  })
}

function controlAnyKnownMediaTab(command, sendResponse) {
  getRememberedKnownMediaTab((cachedTab) => {
    if (cachedTab) {
      controlMediaTab(cachedTab.id, command, sendResponse)
      return
    }

    chrome.tabs.query({}, (allTabs) => {
      const preferredSource =
        typeof command === "object" ? command.preferredSource || "" : ""
      const targetTab = allTabs
        .filter(isKnownMediaTab)
        .sort(
          (a, b) =>
            getKnownMediaTabPriority(b, preferredSource) -
            getKnownMediaTabPriority(a, preferredSource),
        )[0]
      if (targetTab) {
        rememberKnownMediaTab(targetTab)
        controlMediaTab(targetTab.id, command, sendResponse)
      } else {
        sendResponse({ ok: false, error: "NO_TARGET_TAB" })
      }
    })
  })
}

function controlMediaTab(tabId, command, sendResponse) {
  chrome.tabs.sendMessage(
    tabId,
    { action: "mediaControl", command },
    (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        runLegacyControlMediaTab(tabId, command, sendResponse)
      } else {
        sendResponse(response)
      }
    },
  )
}

