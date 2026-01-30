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
          chrome.scripting.executeScript({
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
          })
        }
      })
    })
    return true
  }
})

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
