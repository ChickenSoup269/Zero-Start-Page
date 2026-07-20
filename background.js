// console.log("Background script loaded") // For debugging

// Setup Side Panel to open when the extension icon is clicked based on user setting
chrome.storage.local.get(["actionBehavior"], (data) => {
  const behavior = data.actionBehavior || "sidepanel";
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: behavior === "sidepanel" }).catch(() => {});
  }
});

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
  const isLiteralNewTab = currentUrl === "chrome://newtab/" || currentPendingUrl === "chrome://newtab/"
  // Tab lỗi thường có URL là rỗng (do bị Chrome chặn) hoặc chứa URL của extension nhưng không load được.
  const isEmptyNewTab = !tab.url && !tab.pendingUrl

  if (isStartpageUrl || isEmptyNewTab || isLiteralNewTab) {
    // PHÁT HIỆN DỰA TRÊN QUAN SÁT CỦA BẠN:
    // Tab lỗi (chrome://newtab bị mất kết nối) sẽ có title là "New Tab", "Thẻ mới", rỗng, hoặc là một cái URL.
    // Tab sống khỏe sẽ có title là "Start Page" (hoặc tên bạn đổi trong settings).
    const isZombieTitle =
      !tab.title ||
      tab.title === "New Tab" ||
      tab.title === "Thẻ mới" ||
      tab.title === "chrome://newtab/" ||
      tab.title.includes("site can't be reached") ||
      tab.title.includes("chrome-extension://")

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
    const behavior = data.actionBehavior || "sidepanel";
    if (behavior === "newtab") {
      openStartpageTab();
    } else if (behavior === "popup") {
      chrome.windows.create({
        url: chrome.runtime.getURL("sidepanel.html"),
        type: "popup",
        width: 450,
        height: 600,
        focused: true
      });
    }
  });
});
chrome.tabs?.onRemoved?.addListener((tabId) => {
  clearRememberedKnownMediaTab(tabId)
  delete mediaStates[tabId]
})
chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  // 2. LƯỚI QUÉT CHÍ MẠNG: Chỉ chạy khi tab đã complete để không ngắt quãng quá trình tải
  if (changeInfo.status === "complete" || changeInfo.title) {
    rescueZombieTab(tab)
  }

  // 1. Media caching logic
  if (tabId === lastKnownMediaTabId && changeInfo.url) {
    if (!isKnownMediaTab(tab)) clearRememberedKnownMediaTab(tabId)
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

      // Broadcast update to all Startpage tabs
      chrome.tabs.query({}, (tabs) => {
        const startpageUrl = chrome.runtime.getURL("index.html")
        tabs.forEach((tab) => {
          if (tab.url && tab.url.startsWith(startpageUrl)) {
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "mediaStateUpdatedBroadcast",
                state: { audible: true, ...request.state },
              },
              () => {
                // Ignore errors from tabs that might be closed or not loaded yet
                const err = chrome.runtime.lastError
              },
            )
          }
        })
      })
    }
    return
  }

  if (request.action === "updateActionBehavior") {
    const behavior = request.behavior || "sidepanel"
    chrome.storage.local.set({ actionBehavior: behavior }, () => {
      if (chrome.sidePanel) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: behavior === "sidepanel" }).catch(() => {})
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
        if (mediaStates[tab.id]) {
          sendResponse({ audible: true, ...mediaStates[tab.id] })
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
    chrome.tabs.query({ audible: true }, (tabs) => {
      if (tabs[0]) {
        rememberKnownMediaTab(tabs[0])
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
      if (mediaStates[cachedTab.id]) {
        sendResponse({ audible: true, ...mediaStates[cachedTab.id] })
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
        if (mediaStates[tab.id]) {
          sendResponse({ audible: true, ...mediaStates[tab.id] })
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

function runLegacyControlMediaTab(tabId, command, sendResponse) {
  chrome.scripting.executeScript(
    {
      target: { tabId },
      func: (command) => {
        const video =
          document.querySelector("video") || document.querySelector("audio")
        const cmdName = typeof command === "string" ? command : command.name
        const isSpotify = window.location.href.includes("spotify.com")
        const isZing =
          window.location.href.includes("zingmp3.vn") ||
          window.location.href.includes("mp3.zing.vn")
        const isSoundCloud = window.location.href.includes("soundcloud.com")
        const isAppleMusic = window.location.href.includes("music.apple.com")
        const isNct =
          window.location.href.includes("nhaccuatui.com") ||
          window.location.href.includes("nct.vn")
        const textFrom = (selectors) => {
          for (const selector of selectors) {
            const text = document.querySelector(selector)?.textContent?.trim()
            if (text) return text
          }
          return ""
        }
        const parseTime = (value) => {
          const text = String(value || "").trim()
          if (!text || !text.includes(":")) return 0
          const parts = text.split(":").map((part) => Number(part))
          if (parts.some((part) => Number.isNaN(part))) return 0
          return parts.reduce((total, part) => total * 60 + part, 0)
        }
        const clickFirst = (selectors) => {
          for (const selector of selectors) {
            const el = document.querySelector(selector)
            if (el) {
              el.click()
              return true
            }
          }
          return false
        }
        const seekWebSlider = (time) => {
          const slider =
            document.querySelector(
              '[data-testid="playback-progressbar"] input[type="range"]',
            ) ||
            document.querySelector(
              '[data-testid="playback-progressbar"] [role="slider"]',
            ) ||
            document.querySelector('[data-testid="playback-progressbar"]') ||
            document.querySelector(".duration-bar input[type='range']") ||
            document.querySelector(
              ".player-controls__container input[type='range']",
            ) ||
            document.querySelector(".zm-slider input[type='range']") ||
            document.querySelector(".zm-slider [role='slider']") ||
            document.querySelector(".playbackTimeline__progressWrapper") ||
            document.querySelector(".playbackTimeline__progressBar") ||
            document.querySelector('[aria-label*="progress" i][role="slider"]')

          if (!slider) return false
          let max =
            Number(slider.max) ||
            Number(slider.getAttribute("aria-valuemax")) ||
            parseTime(
              textFrom([
                ".playbackTimeline__duration span:last-child",
                ".playbackTimeline__duration",
                ".duration-bar .time.right",
                ".time.right",
              ]),
            )
          if (!max) return false

          const value = Math.max(
            0,
            Math.min(max, max > 36000 ? time * 1000 : time),
          )
          const clickSliderAtValue = () => {
            const rect = slider.getBoundingClientRect()
            if (!rect.width) return false
            const clientX = rect.left + rect.width * (value / max)
            const clientY = rect.top + rect.height / 2
            ;["pointerdown", "mousedown", "mouseup", "click"].forEach(
              (type) => {
                slider.dispatchEvent(
                  new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    clientX,
                    clientY,
                  }),
                )
              },
            )
            return true
          }
          if ("value" in slider) {
            const ownSetter = Object.getOwnPropertyDescriptor(
              slider,
              "value",
            )?.set
            const protoSetter = Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(slider),
              "value",
            )?.set
            if (protoSetter && ownSetter !== protoSetter) {
              protoSetter.call(slider, String(value))
            } else if (ownSetter) {
              ownSetter.call(slider, String(value))
            } else {
              slider.value = String(value)
            }
            slider.dispatchEvent(new Event("input", { bubbles: true }))
            slider.dispatchEvent(new Event("change", { bubbles: true }))
            clickSliderAtValue()
            return true
          }
          return clickSliderAtValue()
        }

        switch (cmdName) {
          case "playPause":
            if (isSoundCloud) {
              clickFirst([
                ".playControl",
                ".playControls__play",
                'button[title="Play current"]',
                'button[title="Pause current"]',
              ])
            } else if (video) {
              if (video.paused) video.play()
              else video.pause()
            } else if (isSpotify || isZing || isAppleMusic || isNct) {
              clickFirst([
                '[data-testid="control-button-playpause"]',
                '[data-testid="playback-controls-play-button"]',
                'button[aria-label*="Play" i]',
                'button[aria-label*="Pause" i]',
                'button[aria-label*="Phát" i]',
                'button[aria-label*="Tạm dừng" i]',
                'button[title*="Play" i]',
                'button[title*="Pause" i]',
                ".player-controls__container .btn-play",
                ".zm-btn.btn-play",
                ".player-control .btn-play",
                ".box_playing .btn-play",
                ".player .btn-play",
                'button[title="Phát"]',
                'button[title="Tạm dừng"]',
              ])
            }
            break
          case "next":
            clickFirst([
              ".ytp-next-button",
              '[data-testid="control-button-skip-forward"]',
              ".player-controls__container .btn-next",
              ".zm-btn.btn-next",
              ".player-control .btn-next",
              ".box_playing .btn-next",
              ".player .btn-next",
              ".skipControl__next",
              ".playControls__next",
              '[aria-label="Next"]',
              'button[title="Tiếp theo"]',
            ])
            break
          case "prev":
            clickFirst([
              ".ytp-prev-button",
              '[data-testid="control-button-skip-back"]',
              ".player-controls__container .btn-pre",
              ".player-controls__container .btn-prev",
              ".zm-btn.btn-pre",
              ".zm-btn.btn-prev",
              ".player-control .btn-pre",
              ".player-control .btn-prev",
              ".box_playing .btn-pre",
              ".box_playing .btn-prev",
              ".player .btn-pre",
              ".player .btn-prev",
              ".skipControl__previous",
              ".playControls__prev",
              '[aria-label="Previous"]',
              'button[title="Trước đó"]',
            ])
            break
          case "seekTo":
            if (typeof command.time === "number") {
              if (video && !isSoundCloud) {
                video.currentTime = command.time
              } else if (
                isSpotify ||
                isZing ||
                isSoundCloud ||
                isAppleMusic ||
                isNct
              ) {
                seekWebSlider(command.time)
              }
            }
            break
        }
      },
      args: [command],
    },
    () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message })
        return
      }
      sendResponse({ ok: true })
    },
  )
}

function getMediaFromTab(tabId, sendResponse) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: () => {
        const metadata = navigator.mediaSession.metadata
        const video =
          document.querySelector("video") || document.querySelector("audio")
        const isSpotify = window.location.href.includes("spotify.com")
        const isZing =
          window.location.href.includes("zingmp3.vn") ||
          window.location.href.includes("mp3.zing.vn")
        const isSoundCloud = window.location.href.includes("soundcloud.com")
        const isAppleMusic = window.location.href.includes("music.apple.com")
        const isNct =
          window.location.href.includes("nhaccuatui.com") ||
          window.location.href.includes("nct.vn")
        const textFrom = (selectors) => {
          for (const selector of selectors) {
            const text = document.querySelector(selector)?.textContent?.trim()
            if (text) return text
          }
          return ""
        }
        const parseTime = (value) => {
          const text = String(value || "").trim()
          if (!text || !text.includes(":")) return 0
          const parts = text.split(":").map((part) => Number(part))
          if (parts.some((part) => Number.isNaN(part))) return 0
          return parts.reduce((total, part) => total * 60 + part, 0)
        }
        const webPlayback = (() => {
          if (!isSpotify && !isZing && !isSoundCloud && !isAppleMusic && !isNct)
            return null
          const slider =
            document.querySelector(
              '[data-testid="playback-progressbar"] input[type="range"]',
            ) ||
            document.querySelector(
              '[data-testid="playback-progressbar"] [role="slider"]',
            ) ||
            document.querySelector('[data-testid="playback-progressbar"]') ||
            document.querySelector(".duration-bar input[type='range']") ||
            document.querySelector(
              ".player-controls__container input[type='range']",
            ) ||
            document.querySelector(".zm-slider input[type='range']") ||
            document.querySelector(".zm-slider [role='slider']") ||
            document.querySelector(
              '[aria-label*="timeline" i][role="slider"]',
            ) ||
            document.querySelector('[aria-label*="time" i][role="slider"]') ||
            document.querySelector(".playbackTimeline__progressWrapper") ||
            document.querySelector(".playbackTimeline__progressBar") ||
            document.querySelector('[aria-label*="progress" i][role="slider"]')
          let currentTime =
            Number(slider?.value) ||
            Number(slider?.getAttribute("aria-valuenow")) ||
            parseTime(
              textFrom([
                '[data-testid="playback-position"]',
                ".playback-bar__progress-time:first-child",
                ".duration-bar .time.left",
                ".time.left",
                ".playbackTimeline__timePassed span:last-child",
                ".playbackTimeline__timePassed",
              ]),
            )
          let duration =
            Number(slider?.max) ||
            Number(slider?.getAttribute("aria-valuemax")) ||
            parseTime(
              textFrom([
                '[data-testid="playback-duration"]',
                ".playback-bar__progress-time:last-child",
                ".duration-bar .time.right",
                ".time.right",
                ".playbackTimeline__duration span:last-child",
                ".playbackTimeline__duration",
              ]),
            )
          if (duration > 36000) {
            currentTime /= 1000
            duration /= 1000
          }
          const playPauseLabel =
            document
              .querySelector('[data-testid="control-button-playpause"]')
              ?.getAttribute("aria-label")
              ?.toLowerCase() ||
            document
              .querySelector(".player-controls__container .btn-play")
              ?.getAttribute("aria-label")
              ?.toLowerCase() ||
            document
              .querySelector(".playControl")
              ?.getAttribute("aria-label")
              ?.toLowerCase() ||
            ""
          const zingPlayButton = document.querySelector(
            ".player-controls__container .btn-play, .zm-btn.btn-play",
          )
          const soundCloudPlayButton = document.querySelector(".playControl")
          const mediaState = navigator.mediaSession?.playbackState
          const paused =
            mediaState === "playing"
              ? false
              : mediaState === "paused"
                ? true
                : isZing
                  ? !zingPlayButton?.classList.contains("is-playing") &&
                    !zingPlayButton?.classList.contains("playing")
                  : isSoundCloud
                    ? !soundCloudPlayButton?.classList.contains("playing")
                    : playPauseLabel.includes("play")
          return { currentTime, duration, paused }
        })()

        // Selectors for specific sites
        const ytTitle =
          document.querySelector("h1.ytd-watch-metadata yt-formatted-string")
            ?.textContent ||
          document.querySelector(
            "yt-formatted-string.ytd-video-primary-info-renderer",
          )?.textContent
        const ytArtist =
          document.querySelector("yt-formatted-string.ytd-channel-name")
            ?.textContent ||
          document.querySelector("a.ytp-title-expanded-channel-link")
            ?.textContent

        const spotifyTitle = textFrom([
          '[data-testid="now-playing-widget"] [data-testid="context-item-link"]',
          '[data-testid="context-item-info-title"]',
          '[data-testid="now-playing-widget"] a[href*="/track/"]',
        ])
        const spotifyArtist = textFrom([
          '[data-testid="now-playing-widget"] [data-testid="context-item-info-subtitles"]',
          '[data-testid="context-item-info-subtitles"]',
        ])
        const zingTitle = textFrom([
          ".player-controls__container .media .title",
          ".player-controls__container .media-content .title",
          ".player-controls__container .title",
          ".now-playing .title",
          ".media-content .title",
          ".song-title",
        ])
        const zingArtist = textFrom([
          ".player-controls__container .media .subtitle",
          ".player-controls__container .media-content .subtitle",
          ".player-controls__container .subtitle",
          ".now-playing .subtitle",
          ".media-content .subtitle",
          ".artist-names",
          ".artists",
        ])
        const soundCloudTitle = textFrom([
          ".playbackSoundBadge__titleLink",
          ".playbackSoundBadge__title a",
          ".playbackSoundBadge__title",
          ".soundTitle__title",
          ".soundTitle__title span",
        ])
        const soundCloudArtist = textFrom([
          ".playbackSoundBadge__usernameLink",
          ".playbackSoundBadge__lightLink",
          ".soundTitle__username",
          ".soundTitle__username span",
        ])
        const appleTitle = textFrom([
          '[data-testid="track-title"]',
          ".web-chrome-playback-lcd__song-name",
          ".songs-list-row--selected .songs-list-row__song-name",
          ".songs-list-row__song-name",
        ])
        const appleArtist = textFrom([
          '[data-testid="track-artist"]',
          ".web-chrome-playback-lcd__sub-copy",
          ".songs-list-row--selected .songs-list-row__by-line",
          ".songs-list-row__by-line",
        ])
        const nctTitle = textFrom([
          ".box_playing .name_song",
          ".box_playing .name-song",
          ".player .name_song",
          ".player .name-song",
          ".name_song",
          ".name-song",
          ".title_song",
        ])
        const nctArtist = textFrom([
          ".box_playing .name_singer",
          ".box_playing .name-singer",
          ".player .name_singer",
          ".player .name-singer",
          ".name_singer",
          ".name-singer",
          ".singer-name",
        ])

        return {
          title:
            metadata?.title ||
            ytTitle ||
            spotifyTitle ||
            zingTitle ||
            soundCloudTitle ||
            appleTitle ||
            nctTitle ||
            document.title.replace(/^\(\d+\)\s/, ""),
          artist:
            metadata?.artist ||
            ytArtist ||
            spotifyArtist ||
            zingArtist ||
            soundCloudArtist ||
            appleArtist ||
            nctArtist ||
            "",
          paused:
            isSoundCloud && webPlayback
              ? webPlayback.paused
              : video
                ? video.paused
                : (webPlayback?.paused ?? true),
          currentTime:
            video &&
            typeof video.currentTime === "number" &&
            video.currentTime > 0
              ? video.currentTime
              : webPlayback?.currentTime || 0,
          duration: video
            ? isFinite(video.duration) && video.duration > 0
              ? video.duration
              : webPlayback?.duration || 0
            : webPlayback?.duration || 0,
          url: window.location.href,
          source: isSpotify
            ? "spotify"
            : isZing
              ? "zingmp3"
              : isSoundCloud
                ? "soundcloud"
                : isAppleMusic
                  ? "applemusic"
                  : isNct
                    ? "nhaccuatui"
                    : "",
          thumbnail: (() => {
            // Priority 1: MediaSession Artwork
            if (metadata && metadata.artwork && metadata.artwork.length > 0) {
              try {
                const largest = metadata.artwork.reduce((prev, curr) => {
                  const getVal = (s) => parseInt(s?.split("x")[0]) || 0
                  return getVal(curr.sizes) >= getVal(prev.sizes) ? curr : prev
                })
                if (largest.src) return largest.src
              } catch (e) {}
            }

            // Priority 2: YouTube Specific
            if (window.location.href.includes("youtube.com")) {
              const videoId = new URLSearchParams(window.location.search).get(
                "v",
              )
              if (videoId)
                return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

              // YouTube Music player bar thumbnail fallback
              const ytThumb =
                document.querySelector("img.ytp-videowall-still-image")?.src ||
                document.querySelector("img.yt-music-player-bar")?.src ||
                document
                  .querySelector(".ytp-cued-thumbnail-overlay-image")
                  ?.style.backgroundImage?.slice(5, -2)
              if (ytThumb) return ytThumb
            }

            // Priority 3: Spotify Specific
            if (window.location.href.includes("spotify.com")) {
              const spotThumb =
                document.querySelector('[data-testid="now-playing-widget"] img')
                  ?.src || document.querySelector(".cover-art img")?.src
              if (spotThumb) return spotThumb
            }

            if (
              window.location.href.includes("zingmp3.vn") ||
              window.location.href.includes("mp3.zing.vn")
            ) {
              const zingThumb =
                document.querySelector(".player-controls__container img")
                  ?.src ||
                document.querySelector(".now-playing img")?.src ||
                document.querySelector(".media-left img")?.src ||
                document.querySelector('img[src*="zmdcdn.me"]')?.src
              if (zingThumb) return zingThumb
            }

            if (window.location.href.includes("soundcloud.com")) {
              const styleThumb =
                document.querySelector(
                  ".playbackSoundBadge__avatar span[style*='background-image']",
                )?.style.backgroundImage ||
                document.querySelector(
                  "[style*='sndcdn.com'][style*='background-image']",
                )?.style.backgroundImage ||
                ""
              const soundCloudThumb =
                document.querySelector(".playbackSoundBadge__avatar img")
                  ?.src ||
                styleThumb.replace(/^url\(["']?/, "").replace(/["']?\)$/, "") ||
                document.querySelector(".image__full")?.src ||
                document.querySelector('img[src*="sndcdn.com"]')?.src
              if (soundCloudThumb) return soundCloudThumb
            }

            if (window.location.href.includes("music.apple.com")) {
              const appleThumb =
                document.querySelector('[data-testid="artwork-component"] img')
                  ?.src ||
                document.querySelector(".web-chrome-playback-lcd__artwork img")
                  ?.src ||
                document.querySelector('img[src*="mzstatic.com"]')?.src
              if (appleThumb) return appleThumb
            }

            if (
              window.location.href.includes("nhaccuatui.com") ||
              window.location.href.includes("nct.vn")
            ) {
              const nctThumb =
                document.querySelector(".box_playing img")?.src ||
                document.querySelector(".player img")?.src ||
                document.querySelector('img[src*="nhaccuatui"]')?.src ||
                document.querySelector('img[src*="nct"]')?.src
              if (nctThumb) return nctThumb
            }

            // Priority 4: Generic OG Image
            const ogImg = document.querySelector(
              'meta[property="og:image"]',
            )?.content
            if (ogImg) return ogImg

            return ""
          })(),
        }
      },
    },
    (results) => {
      if (chrome.runtime.lastError || !results || !results[0]) {
        sendResponse({ audible: false })
      } else {
        sendResponse({ audible: true, ...results[0].result })
      }
    },
  )
}
