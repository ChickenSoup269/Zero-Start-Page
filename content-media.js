(function () {
  let updateInterval = null

  function getMediaState() {
    const metadata = navigator.mediaSession?.metadata
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
        document.querySelector(".player-controls__container input[type='range']") ||
        document.querySelector(".zm-slider input[type='range']") ||
        document.querySelector(".zm-slider [role='slider']") ||
        document.querySelector('[aria-label*="timeline" i][role="slider"]') ||
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

    const paused =
      isSoundCloud && webPlayback
        ? webPlayback.paused
        : video
          ? video.paused
          : webPlayback?.paused ?? true

    const currentTime =
      video && typeof video.currentTime === "number" && video.currentTime > 0
        ? video.currentTime
        : webPlayback?.currentTime || 0

    const duration = video
      ? isFinite(video.duration) && video.duration > 0
        ? video.duration
        : webPlayback?.duration || 0
      : webPlayback?.duration || 0

    const thumbnail = (() => {
      if (metadata && metadata.artwork && metadata.artwork.length > 0) {
        try {
          const largest = metadata.artwork.reduce((prev, curr) => {
            const getVal = (s) => parseInt(s?.split("x")[0]) || 0
            return getVal(curr.sizes) >= getVal(prev.sizes) ? curr : prev
          })
          if (largest.src) return largest.src
        } catch (e) {}
      }

      if (window.location.href.includes("youtube.com")) {
        const videoId = new URLSearchParams(window.location.search).get("v")
        if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

        const ytThumb =
          document.querySelector("img.ytp-videowall-still-image")?.src ||
          document.querySelector("img.yt-music-player-bar")?.src ||
          document.querySelector(".ytp-cued-thumbnail-overlay-image")?.style
            .backgroundImage?.slice(5, -2)
        if (ytThumb) return ytThumb
      }

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
          document.querySelector(".player-controls__container img")?.src ||
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
          document.querySelector(".playbackSoundBadge__avatar img")?.src ||
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

      const ogImg = document.querySelector('meta[property="og:image"]')?.content
      if (ogImg) return ogImg

      return ""
    })()

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
      paused,
      currentTime,
      duration,
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
      thumbnail,
    }
  }

  function sendStateUpdate() {
    try {
      const state = getMediaState()
      chrome.runtime.sendMessage({
        action: "mediaStateUpdated",
        state: state,
      })
      return state
    } catch (e) {
      // Ignore extension context invalidated errors
    }
  }

  function handlePlay() {
    sendStateUpdate()
    startPeriodicSync()
  }

  function handlePause() {
    sendStateUpdate()
    stopPeriodicSync()
  }

  function startPeriodicSync() {
    if (updateInterval) return
    updateInterval = setInterval(() => {
      const state = sendStateUpdate()
      if (state && state.paused) {
        stopPeriodicSync()
      }
    }, 4000)
  }

  function stopPeriodicSync() {
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  // Setup event listeners
  document.addEventListener("play", handlePlay, true)
  document.addEventListener("pause", handlePause, true)
  document.addEventListener("seeked", sendStateUpdate, true)
  document.addEventListener("durationchange", sendStateUpdate, true)

  // Listen for control commands from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "mediaControl") {
      const cmdName =
        typeof request.command === "string" ? request.command : request.command.name
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

      try {
        if (cmdName === "playPause") {
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
        } else if (cmdName === "next") {
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
        } else if (cmdName === "prev") {
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
        } else if (cmdName === "seekTo") {
          if (typeof request.command.time === "number") {
            if (video && !isSoundCloud) {
              video.currentTime = request.command.time
            } else if (isSpotify || isZing || isSoundCloud || isAppleMusic || isNct) {
              seekWebSlider(request.command.time)
            }
          }
        }

        // Immediately sync back
        setTimeout(sendStateUpdate, 150)
        sendResponse({ ok: true })
      } catch (e) {
        sendResponse({ ok: false, error: e.message })
      }
    }
  })

  // Initial update
  sendStateUpdate()

  // Backup polling to detect play state if events fail or elements load later
  setInterval(() => {
    if (!updateInterval) {
      try {
        const state = getMediaState()
        if (state && !state.paused) {
          handlePlay()
        }
      } catch (e) {}
    }
  }, 2000)
})()
