console.log("Background script loaded") // For debugging

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log("Message received:", request) // For debugging
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
      if (tabs.length === 0) {
        // Fallback: check all tabs for potential media sites
        chrome.tabs.query({}, (allTabs) => {
          const tab = allTabs.find(
            (t) =>
              t.url.includes("youtube.com") ||
              t.url.includes("spotify.com") ||
              t.url.includes("music.youtube.com"),
          )
          if (tab) {
            getMediaFromTab(tab.id, sendResponse)
          } else {
            sendResponse({ audible: false })
          }
        })
      } else {
        getMediaFromTab(tabs[0].id, sendResponse)
      }
    })
    return true
  }

  if (request.action === "mediaControl") {
    chrome.tabs.query({ audible: true }, (tabs) => {
      // Find the first audible tab or just any potential media tab
      chrome.tabs.query({}, (allTabs) => {
        const targetTab =
          tabs[0] ||
          allTabs.find(
            (t) =>
              t.url.includes("youtube.com") ||
              t.url.includes("spotify.com") ||
              t.url.includes("music.youtube.com"),
          )
        if (targetTab) {
          chrome.scripting.executeScript(
            {
              target: { tabId: targetTab.id },
              func: (command) => {
                const video =
                  document.querySelector("video") ||
                  document.querySelector("audio")
                if (!video) return
                switch (command) {
                  case "playPause":
                    if (video.paused) video.play()
                    else video.pause()
                    break
                  case "next":
                    ;(
                      document.querySelector(".ytp-next-button") ||
                      document.querySelector(
                        '[data-testid="control-button-skip-forward"]',
                      )
                    )?.click()
                    break
                  case "prev":
                    ;(
                      document.querySelector(".ytp-prev-button") ||
                      document.querySelector(
                        '[data-testid="control-button-skip-back"]',
                      )
                    )?.click()
                    break
                }
              },
              args: [request.command],
            },
            () => {
              sendResponse({ ok: true })
            },
          )
        } else {
          sendResponse({ ok: false, error: "NO_TARGET_TAB" })
        }
      })
    })
    return true
  }

  if (request.action === "startAudioSync") {
    findAudioTab((tab) => {
      if (!tab) {
        sendResponse({ ok: false, error: "NO_AUDIO_TAB" })
        return
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => {
            if (window.__startpageAudioSync?.active) return { ok: true }
            const media =
              document.querySelector("video") || document.querySelector("audio")
            if (!media) return { ok: false, error: "NO_MEDIA_ELEMENT" }
            const AudioCtx = window.AudioContext || window.webkitAudioContext
            if (!AudioCtx) return { ok: false, error: "NO_AUDIO_CONTEXT" }

            const audioCtx = new AudioCtx()
            if (audioCtx.state === "suspended") {
              audioCtx.resume().catch(() => {})
            }
            let source
            try {
              source = audioCtx.createMediaElementSource(media)
            } catch (e) {
              return { ok: false, error: "SOURCE_ERROR" }
            }
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 512
            source.connect(analyser)
            analyser.connect(audioCtx.destination)

            const bufferLength = analyser.fftSize
            const dataArray = new Uint8Array(bufferLength)
            let rafId = null

            const sendFrame = () => {
              analyser.getByteTimeDomainData(dataArray)
              const samples = []
              const targetSize = 64
              const step = Math.floor(bufferLength / targetSize)
              for (let i = 0; i < targetSize; i++) {
                const v = dataArray[i * step] / 128 - 1
                samples.push(v)
              }
              chrome.runtime.sendMessage(
                { action: "audioSyncData", samples },
                () => {},
              )
              rafId = requestAnimationFrame(sendFrame)
            }

            sendFrame()
            window.__startpageAudioSync = {
              active: true,
              audioCtx,
              source,
              analyser,
              rafId,
            }
            return { ok: true }
          },
        },
        (results) => {
          if (chrome.runtime.lastError || !results || !results[0]) {
            sendResponse({ ok: false, error: "INJECT_FAILED" })
          } else {
            sendResponse(results[0].result || { ok: false })
          }
        },
      )
    })
    return true
  }

  if (request.action === "stopAudioSync") {
    findAudioTab((tab) => {
      if (!tab) {
        sendResponse({ ok: false, error: "NO_AUDIO_TAB" })
        return
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => {
            const sync = window.__startpageAudioSync
            if (!sync) return { ok: true }
            if (sync.rafId) cancelAnimationFrame(sync.rafId)
            try {
              sync.source?.disconnect()
              sync.analyser?.disconnect()
              sync.audioCtx?.close()
            } catch (e) {
              // ignore
            }
            window.__startpageAudioSync = null
            return { ok: true }
          },
        },
        (results) => {
          if (chrome.runtime.lastError || !results || !results[0]) {
            sendResponse({ ok: false, error: "INJECT_FAILED" })
          } else {
            sendResponse(results[0].result || { ok: false })
          }
        },
      )
    })
    return true
  }

  if (request.action === "audioSyncData" && request._relay !== true) {
    chrome.runtime.sendMessage({
      action: "audioSyncData",
      samples: request.samples,
      _relay: true,
    })
    sendResponse({ ok: true })
    return true
  }
})

function findAudioTab(callback) {
  chrome.tabs.query({ audible: true }, (tabs) => {
    if (tabs.length > 0) {
      callback(tabs[0])
      return
    }
    chrome.tabs.query({}, (allTabs) => {
      const tab = allTabs.find(
        (t) =>
          t.url.includes("youtube.com") ||
          t.url.includes("spotify.com") ||
          t.url.includes("music.youtube.com"),
      )
      callback(tab || null)
    })
  })
}

function getMediaFromTab(tabId, sendResponse) {
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      func: () => {
        const metadata = navigator.mediaSession.metadata
        const video =
          document.querySelector("video") || document.querySelector("audio")

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

        const spotifyTitle = document.querySelector(
          '[data-testid="now-playing-widget"] [data-testid="context-item-link"]',
        )?.textContent
        const spotifyArtist = document.querySelector(
          '[data-testid="now-playing-widget"] [data-testid="context-item-info-subtitles"]',
        )?.textContent

        return {
          title:
            metadata?.title ||
            ytTitle ||
            spotifyTitle ||
            document.title.replace(/^\(\d+\)\s/, ""),
          artist: metadata?.artist || ytArtist || spotifyArtist || "",
          paused: video ? video.paused : true,
          url: window.location.href,
          thumbnail: (() => {
            if (metadata && metadata.artwork && metadata.artwork.length > 0) {
              const largest = metadata.artwork.reduce((prev, curr) => {
                const prevSize = parseInt(prev.sizes?.split("x")[0] || 0)
                const currSize = parseInt(curr.sizes?.split("x")[0] || 0)
                return currSize > prevSize ? curr : prev
              })
              return largest.src
            }
            // Fallback thumbnail for YouTube
            if (window.location.href.includes("youtube.com/watch")) {
              const videoId = new URLSearchParams(window.location.search).get(
                "v",
              )
              if (videoId)
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            }
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
