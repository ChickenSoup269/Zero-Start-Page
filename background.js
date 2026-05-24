console.log("Background script loaded") // For debugging

// Set the uninstall URL
chrome.runtime.onInstalled.addListener(() => {
  // User feedback form link
  const uninstallUrl = "https://docs.google.com/forms/d/e/1FAIpQLSd2unrzbLeLRI3vNpU-XrHY4rLfP1M0busmjKALAU2nMMXVTg/viewform?usp=sf_link";
  
  chrome.runtime.setUninstallURL(uninstallUrl, () => {
    if (chrome.runtime.lastError) {
      console.error("Error setting uninstall URL:", chrome.runtime.lastError);
    } else {
      console.log("Uninstall URL set successfully:", uninstallUrl);
    }
  });
});

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

  if (request.action === "spotifyAuthStatus") {
    getSpotifyAuthStatus()
      .then((status) => sendResponse(status))
      .catch((error) =>
        sendResponse({
          ok: false,
          connected: false,
          redirectUri: getSpotifyRedirectUri(),
          error: error.message,
        }),
      )
    return true
  }

  if (request.action === "spotifyAuth") {
    startSpotifyAuth(request.clientId)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          connected: false,
          redirectUri: getSpotifyRedirectUri(),
          error: error.message,
        }),
      )
    return true
  }

  if (request.action === "spotifyDisconnect") {
    disconnectSpotify()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          connected: false,
          redirectUri: getSpotifyRedirectUri(),
          error: error.message,
        }),
      )
    return true
  }

  if (request.action === "getMediaState") {
    chrome.tabs.query({ audible: true }, (tabs) => {
      if (tabs.length > 0) {
        getMediaFromTab(tabs[0].id, sendResponse)
        return
      }

      getSpotifyPlayback()
        .then((spotifyState) => {
          if (spotifyState?.audible) {
            sendResponse(spotifyState)
            return
          }
          getMediaFromAnyKnownTab(sendResponse)
        })
        .catch(() => getMediaFromAnyKnownTab(sendResponse))
    })
    return true
  }

  if (request.action === "mediaControl") {
    chrome.tabs.query({ audible: true }, (tabs) => {
      if (tabs[0]) {
        controlMediaTab(tabs[0].id, request.command, sendResponse)
        return
      }

      controlSpotifyPlayback(request.command)
        .then((result) => {
          if (result?.ok) {
            sendResponse(result)
            return
          }
          controlAnyKnownMediaTab(request.command, sendResponse)
        })
        .catch(() => controlAnyKnownMediaTab(request.command, sendResponse))
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
                () => {
                  // Silently ignore connection errors
                  const err = chrome.runtime.lastError;
                },
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
    }, () => {
      const err = chrome.runtime.lastError;
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
          t.url?.includes("zingmp3.vn") ||
          t.url?.includes("soundcloud.com") ||
          t.url?.includes("music.youtube.com"),
      )
      callback(tab || null)
    })
  })
}

function isKnownMediaTab(tab) {
  return (
    tab?.url?.includes("youtube.com") ||
    tab?.url?.includes("spotify.com") ||
    tab?.url?.includes("zingmp3.vn") ||
    tab?.url?.includes("soundcloud.com") ||
    tab?.url?.includes("music.youtube.com")
  )
}

function getMediaFromAnyKnownTab(sendResponse) {
  chrome.tabs.query({}, (allTabs) => {
    const tab = allTabs.find(isKnownMediaTab)
    if (tab) {
      getMediaFromTab(tab.id, sendResponse)
    } else {
      sendResponse({ audible: false })
    }
  })
}

function controlAnyKnownMediaTab(command, sendResponse) {
  chrome.tabs.query({}, (allTabs) => {
    const targetTab = allTabs.find(isKnownMediaTab)
    if (targetTab) {
      controlMediaTab(targetTab.id, command, sendResponse)
    } else {
      sendResponse({ ok: false, error: "NO_TARGET_TAB" })
    }
  })
}

function controlMediaTab(tabId, command, sendResponse) {
  chrome.scripting.executeScript(
    {
      target: { tabId },
      func: (command) => {
        const video =
          document.querySelector("video") || document.querySelector("audio")
        const cmdName = typeof command === "string" ? command : command.name
        const isSpotify = window.location.href.includes("spotify.com")
        const isZing = window.location.href.includes("zingmp3.vn")
        const isSoundCloud = window.location.href.includes("soundcloud.com")
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
            document.querySelector(".player-controls__container input[type='range']") ||
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

          const value = Math.max(0, Math.min(max, max > 36000 ? time * 1000 : time))
          const clickSliderAtValue = () => {
            const rect = slider.getBoundingClientRect()
            if (!rect.width) return false
            const clientX = rect.left + rect.width * (value / max)
            const clientY = rect.top + rect.height / 2
            ;["pointerdown", "mousedown", "mouseup", "click"].forEach((type) => {
              slider.dispatchEvent(
                new MouseEvent(type, {
                  bubbles: true,
                  cancelable: true,
                  clientX,
                  clientY,
                }),
              )
            })
            return true
          }
          if ("value" in slider) {
            const ownSetter = Object.getOwnPropertyDescriptor(slider, "value")?.set
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
            } else if (isSpotify || isZing) {
              clickFirst([
                '[data-testid="control-button-playpause"]',
                ".player-controls__container .btn-play",
                ".zm-btn.btn-play",
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
              ".skipControl__next",
              ".playControls__next",
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
              ".skipControl__previous",
              ".playControls__prev",
              'button[title="Trước đó"]',
            ])
            break
          case "seekTo":
            if (typeof command.time === "number") {
              if (video && !isSoundCloud) {
                video.currentTime = command.time
              } else if (isSpotify || isZing || isSoundCloud) {
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

const SPOTIFY_AUTH_KEY = "spotify_web_api_auth"
const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ")

function getSpotifyRedirectUri() {
  try {
    return chrome.identity.getRedirectURL("spotify")
  } catch (error) {
    return ""
  }
}

function spotifyStorageGet() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SPOTIFY_AUTH_KEY], (data) => {
      resolve(data?.[SPOTIFY_AUTH_KEY] || null)
    })
  })
}

function spotifyStorageSet(auth) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SPOTIFY_AUTH_KEY]: auth }, resolve)
  })
}

function spotifyStorageRemove() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([SPOTIFY_AUTH_KEY], resolve)
  })
}

function base64UrlEncode(bytes) {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function randomVerifier(size = 64) {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function createCodeChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return base64UrlEncode(new Uint8Array(digest))
}

function launchSpotifyAuth(url) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!responseUrl) {
        reject(new Error("AUTH_CANCELLED"))
        return
      }
      resolve(responseUrl)
    })
  })
}

async function exchangeSpotifyToken(body) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "SPOTIFY_TOKEN_ERROR")
  }
  return data
}

async function getSpotifyAuthStatus() {
  const auth = await spotifyStorageGet()
  return {
    ok: true,
    connected: Boolean(auth?.refreshToken),
    redirectUri: getSpotifyRedirectUri(),
  }
}

async function startSpotifyAuth(clientId) {
  const cleanClientId = String(clientId || "").trim()
  if (!cleanClientId) throw new Error("MISSING_SPOTIFY_CLIENT_ID")

  const redirectUri = getSpotifyRedirectUri()
  const codeVerifier = randomVerifier()
  const codeChallenge = await createCodeChallenge(codeVerifier)
  const state = randomVerifier(32)
  const authUrl = new URL("https://accounts.spotify.com/authorize")
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: cleanClientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  }).toString()

  const responseUrl = await launchSpotifyAuth(authUrl.toString())
  const callbackUrl = new URL(responseUrl)
  const error = callbackUrl.searchParams.get("error")
  if (error) throw new Error(error)
  if (callbackUrl.searchParams.get("state") !== state) {
    throw new Error("SPOTIFY_STATE_MISMATCH")
  }

  const code = callbackUrl.searchParams.get("code")
  if (!code) throw new Error("SPOTIFY_CODE_MISSING")

  const token = await exchangeSpotifyToken(
    new URLSearchParams({
      client_id: cleanClientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  )

  await spotifyStorageSet({
    clientId: cleanClientId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + (token.expires_in || 3600) * 1000 - 30000,
  })

  return { ok: true, connected: true, redirectUri }
}

async function disconnectSpotify() {
  await spotifyStorageRemove()
  return { ok: true, connected: false, redirectUri: getSpotifyRedirectUri() }
}

async function getValidSpotifyToken() {
  const auth = await spotifyStorageGet()
  if (!auth?.refreshToken || !auth?.clientId) {
    throw new Error("NO_SPOTIFY_AUTH")
  }

  if (auth.accessToken && auth.expiresAt > Date.now() + 60000) {
    return auth.accessToken
  }

  const token = await exchangeSpotifyToken(
    new URLSearchParams({
      client_id: auth.clientId,
      grant_type: "refresh_token",
      refresh_token: auth.refreshToken,
    }),
  )

  const nextAuth = {
    ...auth,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || auth.refreshToken,
    expiresAt: Date.now() + (token.expires_in || 3600) * 1000 - 30000,
  }
  await spotifyStorageSet(nextAuth)
  return nextAuth.accessToken
}

function pickSpotifyImage(item) {
  const images = item?.album?.images || item?.images || item?.show?.images || []
  if (!images.length) return ""
  return images.reduce((best, image) => {
    const bestSize = (best?.width || 0) * (best?.height || 0)
    const imageSize = (image?.width || 0) * (image?.height || 0)
    return imageSize >= bestSize ? image : best
  }, images[0]).url || ""
}

function mapSpotifyPlayback(data) {
  const item = data?.item
  if (!item) return { audible: false }
  const artist =
    item.type === "episode"
      ? item.show?.name || item.publisher || ""
      : item.artists?.map((entry) => entry.name).filter(Boolean).join(", ") || ""

  return {
    audible: true,
    title: item.name || "",
    artist,
    paused: data.is_playing !== true,
    currentTime: (data.progress_ms || 0) / 1000,
    duration: (item.duration_ms || 0) / 1000,
    url: item.external_urls?.spotify || "spotify://desktop",
    thumbnail: pickSpotifyImage(item),
    source: "spotify",
  }
}

async function getSpotifyPlayback() {
  const token = await getValidSpotifyToken()
  const response = await fetch(
    "https://api.spotify.com/v1/me/player?additional_types=track,episode",
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (response.status === 204 || response.status === 404) {
    return { audible: false }
  }
  if (response.status === 401) {
    await spotifyStorageRemove()
    return { audible: false }
  }
  if (!response.ok) {
    throw new Error(`SPOTIFY_PLAYBACK_${response.status}`)
  }

  const data = await response.json()
  return mapSpotifyPlayback(data)
}

async function controlSpotifyPlayback(command) {
  const token = await getValidSpotifyToken()
  const cmdName = typeof command === "string" ? command : command?.name
  let endpoint = ""
  let method = "POST"

  if (cmdName === "playPause") {
    const playback = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (playback.status === 204 || playback.status === 404) {
      return { ok: false, error: "NO_ACTIVE_SPOTIFY_DEVICE" }
    }
    const data = await playback.json().catch(() => ({}))
    endpoint = data.is_playing
      ? "https://api.spotify.com/v1/me/player/pause"
      : "https://api.spotify.com/v1/me/player/play"
    method = "PUT"
  } else if (cmdName === "next") {
    endpoint = "https://api.spotify.com/v1/me/player/next"
  } else if (cmdName === "prev") {
    endpoint = "https://api.spotify.com/v1/me/player/previous"
  } else if (cmdName === "seekTo" && typeof command?.time === "number") {
    const positionMs = Math.max(0, Math.round(command.time * 1000))
    endpoint = `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`
    method = "PUT"
  } else {
    return { ok: false, error: "UNSUPPORTED_SPOTIFY_COMMAND" }
  }

  const response = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 204 || response.status === 202) {
    return { ok: true, source: "spotify" }
  }
  if (response.status === 403) {
    return { ok: false, error: "SPOTIFY_PREMIUM_OR_DEVICE_REQUIRED" }
  }
  if (response.status === 404) {
    return { ok: false, error: "NO_ACTIVE_SPOTIFY_DEVICE" }
  }
  return { ok: response.ok, source: "spotify", error: `SPOTIFY_CONTROL_${response.status}` }
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
        const isZing = window.location.href.includes("zingmp3.vn")
        const isSoundCloud = window.location.href.includes("soundcloud.com")
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
          if (!isSpotify && !isZing && !isSoundCloud) return null
          const slider =
            document.querySelector(
              '[data-testid="playback-progressbar"] input[type="range"]',
            ) ||
            document.querySelector(
              '[data-testid="playback-progressbar"] [role="slider"]',
            ) ||
            document.querySelector('[data-testid="playback-progressbar"]') ||
            document.querySelector(".duration-bar input[type='range']") ||
            document.querySelector(".player-controls__container input[type='range']") ||
            document.querySelector(".zm-slider input[type='range']") ||
            document.querySelector(".zm-slider [role='slider']") ||
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
              ?.toLowerCase() || ""
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

        return {
          title:
            metadata?.title ||
            ytTitle ||
            spotifyTitle ||
            zingTitle ||
            soundCloudTitle ||
            document.title.replace(/^\(\d+\)\s/, ""),
          artist:
            metadata?.artist ||
            ytArtist ||
            spotifyArtist ||
            zingArtist ||
            soundCloudArtist ||
            "",
          paused:
            isSoundCloud && webPlayback
              ? webPlayback.paused
              : video
                ? video.paused
                : webPlayback?.paused ?? true,
          currentTime:
            video && typeof video.currentTime === "number" && video.currentTime > 0
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

            if (window.location.href.includes("zingmp3.vn")) {
              const zingThumb =
                document.querySelector(".player-controls__container img")?.src ||
                document.querySelector(".now-playing img")?.src ||
                document.querySelector(".media-left img")?.src ||
                document.querySelector('img[src*="zmdcdn.me"]')?.src
              if (zingThumb) return zingThumb
            }

            if (window.location.href.includes("soundcloud.com")) {
              const styleThumb =
                document.querySelector(".playbackSoundBadge__avatar span[style*='background-image']")?.style.backgroundImage ||
                document.querySelector("[style*='sndcdn.com'][style*='background-image']")?.style.backgroundImage ||
                ""
              const soundCloudThumb =
                document.querySelector(".playbackSoundBadge__avatar img")?.src ||
                styleThumb.replace(/^url\(["']?/, "").replace(/["']?\)$/, "") ||
                document.querySelector(".image__full")?.src ||
                document.querySelector('img[src*="sndcdn.com"]')?.src
              if (soundCloudThumb) return soundCloudThumb
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
