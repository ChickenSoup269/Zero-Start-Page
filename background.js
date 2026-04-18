console.log("Background script loaded") // For debugging

// Version update check is now handled in main.js for better reliability

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
              t.url?.includes("youtube.com") ||
              t.url?.includes("spotify.com") ||
              t.url?.includes("music.youtube.com"),
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
              t.url?.includes("youtube.com") ||
              t.url?.includes("spotify.com") ||
              t.url?.includes("music.youtube.com"),
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
                const cmdName =
                  typeof command === "string" ? command : command.name
                switch (cmdName) {
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
                  case "seekTo":
                    if (typeof command.time === "number") {
                      video.currentTime = command.time
                    }
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
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.6
            source.connect(analyser)
            analyser.connect(audioCtx.destination)

            const freqBins = analyser.frequencyBinCount // 128
            const dataArray = new Uint8Array(freqBins)

            // Average a slice of frequency bins and normalize to 0..1
            const avgBand = (from, to) => {
              let sum = 0
              for (let i = from; i < to; i++) sum += dataArray[i]
              return sum / (to - from) / 255
            }

            const sendFrame = () => {
              analyser.getByteFrequencyData(dataArray)
              // 4 perceptually-spaced bands (fftSize=256 → binWidth≈172Hz at 44.1kHz)
              // Band 0 Bass     : bins  0–4  → 0–688 Hz
              // Band 1 Low-mid  : bins  4–18 → 688–3101 Hz
              // Band 2 High-mid : bins 18–55 → 3101–9476 Hz
              // Band 3 High     : bins 55–100→ 9476–17230 Hz
              const samples = [
                avgBand(0, 4),
                avgBand(4, 18),
                avgBand(18, 55),
                avgBand(55, 100),
              ]
              chrome.runtime.sendMessage(
                { action: "audioSyncData", samples },
                () => {},
              )
            }

            // Use setInterval (~30fps) instead of requestAnimationFrame to
            // avoid triggering the browser's tab loading indicator on the media page
            const intervalId = setInterval(sendFrame, 33)
            window.__startpageAudioSync = {
              active: true,
              audioCtx,
              source,
              analyser,
              rafId: intervalId,
              _isInterval: true,
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
            if (sync.rafId) {
              if (sync._isInterval) clearInterval(sync.rafId)
              else cancelAnimationFrame(sync.rafId)
            }
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
          t.url?.includes("youtube.com") ||
          t.url?.includes("spotify.com") ||
          t.url?.includes("music.youtube.com"),
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
          currentTime: video ? video.currentTime : 0,
          duration: video ? (isFinite(video.duration) ? video.duration : 0) : 0,
          url: window.location.href,
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
              const videoId = new URLSearchParams(window.location.search).get("v")
              if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
              
              // YouTube Music player bar thumbnail fallback
              const ytThumb = document.querySelector("img.ytp-videowall-still-image")?.src || 
                             document.querySelector("img.yt-music-player-bar")?.src ||
                             document.querySelector(".ytp-cued-thumbnail-overlay-image")?.style.backgroundImage?.slice(5, -2)
              if (ytThumb) return ytThumb
            }

            // Priority 3: Spotify Specific
            if (window.location.href.includes("spotify.com")) {
               const spotThumb = document.querySelector('[data-testid="now-playing-widget"] img')?.src ||
                                document.querySelector(".cover-art img")?.src
               if (spotThumb) return spotThumb
            }

            // Priority 4: Generic OG Image
            const ogImg = document.querySelector('meta[property="og:image"]')?.content
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
