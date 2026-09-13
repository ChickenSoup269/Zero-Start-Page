/**
 * Legacy Media Tab Controller & Scraper
 * Executes scripts in media tabs (YouTube, Spotify, ZingMP3, Apple Music, etc.)
 * Extracted from background.js
 */

export function runLegacyControlMediaTab(tabId, command, sendResponse) {
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

export function getMediaFromTab(tabId, sendResponse) {
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
          const spotifyPlayBtn = document.querySelector(
            '[data-testid="control-button-playpause"]',
          )
          const spotifyIsPlaying = Boolean(
            spotifyPlayBtn &&
            (spotifyPlayBtn
              .getAttribute("aria-label")
              ?.toLowerCase()
              .includes("pause") ||
              spotifyPlayBtn
                .getAttribute("aria-label")
                ?.toLowerCase()
                .includes("tạm dừng") ||
              spotifyPlayBtn.querySelector('svg path[d*="M2.7"]') !== null ||
              spotifyPlayBtn.querySelector('svg path[d*="M3 2"]') !== null ||
              navigator.mediaSession?.playbackState === "playing"),
          )
          const zingPlayButton = document.querySelector(
            ".player-controls__container .btn-play, .zm-btn.btn-play",
          )
          const soundCloudPlayButton = document.querySelector(
            ".playControl, .playControls__play, button[title*='Play' i], button[title*='Pause' i]",
          )
          const paused = isSpotify
            ? !spotifyIsPlaying
            : navigator.mediaSession?.playbackState === "playing"
              ? false
              : navigator.mediaSession?.playbackState === "paused"
                ? true
                : isZing
                  ? !zingPlayButton?.classList.contains("is-playing") &&
                    !zingPlayButton?.classList.contains("playing")
                  : isSoundCloud
                    ? !soundCloudPlayButton?.classList.contains("playing") &&
                      !soundCloudPlayButton?.classList.contains(
                        "playControls__play--playing",
                      )
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
            isSpotify && webPlayback
              ? webPlayback.paused
              : isSoundCloud && webPlayback
                ? webPlayback.paused
                : video
                  ? video.paused
                  : (webPlayback?.paused ?? true),
          currentTime:
            (isSpotify || isSoundCloud || isZing) && webPlayback
              ? webPlayback.currentTime
              : video &&
                  typeof video.currentTime === "number" &&
                  video.currentTime > 0
                ? video.currentTime
                : webPlayback?.currentTime || 0,
          duration:
            (isSpotify || isSoundCloud || isZing) &&
            webPlayback &&
            webPlayback.duration > 0
              ? webPlayback.duration
              : video
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
            function upgradeThumbnailUrl(url, pageUrl = "") {
              if (!url || typeof url !== "string") return ""
              let upgraded = url.trim()

              // 1. YouTube & YouTube Music
              const ytImgMatch = upgraded.match(
                /(?:i\.ytimg\.com|img\.youtube\.com)\/vi\/([a-zA-Z0-9_-]+)/i,
              )
              if (ytImgMatch && ytImgMatch[1]) {
                return `https://i.ytimg.com/vi/${ytImgMatch[1]}/maxresdefault.jpg`
              }

              const fullContextUrl =
                pageUrl ||
                (typeof window !== "undefined" ? window.location.href : "")
              if (
                fullContextUrl &&
                (fullContextUrl.includes("youtube.com") ||
                  fullContextUrl.includes("youtu.be"))
              ) {
                let videoId = ""
                try {
                  const urlObj = new URL(fullContextUrl)
                  videoId = urlObj.searchParams.get("v") || ""
                  if (!videoId && urlObj.pathname.startsWith("/shorts/")) {
                    videoId = urlObj.pathname.split("/")[2] || ""
                  }
                  if (!videoId && fullContextUrl.includes("youtu.be/")) {
                    videoId = urlObj.pathname.slice(1).split(/[?#]/)[0] || ""
                  }
                } catch (e) {}

                if (
                  videoId &&
                  (upgraded.includes("ytimg.com") ||
                    upgraded.includes("googleusercontent.com") ||
                    !upgraded)
                ) {
                  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
                }
              }

              if (
                upgraded.includes("googleusercontent.com") ||
                upgraded.includes("yt3.ggpht.com")
              ) {
                if (/=[sw]\d+/i.test(upgraded)) {
                  upgraded = upgraded.replace(
                    /=w\d+-h\d+[^?#]*/i,
                    "=w1080-h1080-l90-rj",
                  )
                  upgraded = upgraded.replace(/=s\d+[^?#]*/i, "=s1200")
                  return upgraded
                }
              }

              // 2. Spotify
              if (
                upgraded.includes("scdn.co") ||
                upgraded.includes("spotifycdn.com") ||
                upgraded.includes("spotify.com")
              ) {
                upgraded = upgraded.replace(
                  /ab67616d0000(?:1e02|4851)/g,
                  "ab67616d0000b273",
                )
                upgraded = upgraded.replace(
                  /ab6761610000(?:f68d|5174)/g,
                  "ab6761610000e5eb",
                )
                upgraded = upgraded.replace(
                  /ab6765630000(?:1e02|4851|f68d|5174)/g,
                  "ab6765630000b273",
                )
                upgraded = upgraded.replace(
                  /ab67706f0000(?:1e02|4851|f68d|5174)/g,
                  "ab67706f0000b273",
                )
                return upgraded
              }

              // 3. Apple Music
              if (
                upgraded.includes("mzstatic.com") ||
                upgraded.includes("music.apple.com")
              ) {
                upgraded = upgraded.replace(
                  /\d+x\d+bb\.(jpe?g|png|webp)/i,
                  "1000x1000bb.$1",
                )
                upgraded = upgraded.replace(
                  /\/image\/thumb\/(.*?)\/\d+x\d+.*?\.(jpe?g|png|webp)/i,
                  "/image/thumb/$1/1000x1000bb.$2",
                )
                upgraded = upgraded.replace(/\{w\}x\{h\}/gi, "1000x1000")
                return upgraded
              }

              // 4. SoundCloud
              if (
                upgraded.includes("sndcdn.com") ||
                upgraded.includes("soundcloud.com")
              ) {
                upgraded = upgraded.replace(
                  /-(?:t(?:50x50|67x67|120x120|200x200|300x300)|large)\.([a-z0-9]+)/i,
                  "-t500x500.$1",
                )
                return upgraded
              }

              // 5. Zing MP3
              if (
                upgraded.includes("zmdcdn.me") ||
                upgraded.includes("zingmp3.vn")
              ) {
                upgraded = upgraded.replace(
                  /w(?:94|240|360)_r1x1_jpeg/i,
                  "w1024_r1x1_jpeg",
                )
                upgraded = upgraded.replace(
                  /w(?:94|240|360)_r1x1_/i,
                  "w1024_r1x1_",
                )
                return upgraded
              }

              // 6. NhacCuaTui
              if (
                upgraded.includes("nhaccuatui.com") ||
                upgraded.includes("nct.vn")
              ) {
                upgraded = upgraded.replace(
                  /_(?:small|medium|130)\.(jpe?g|png)/i,
                  "_600.$1",
                )
                return upgraded
              }

              return upgraded
            }

            // 1. YouTube specific first to ensure clean videoId maxresdefault
            if (
              window.location.href.includes("youtube.com") ||
              window.location.href.includes("youtu.be")
            ) {
              const videoId = new URLSearchParams(
                window.location.search,
              ).get("v")
              if (videoId)
                return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
            }

            // 2. MediaSession Artwork
            if (metadata && metadata.artwork && metadata.artwork.length > 0) {
              try {
                const largest = metadata.artwork.reduce((prev, curr) => {
                  const getVal = (s) => parseInt(s?.split("x")[0]) || 0
                  return getVal(curr.sizes) >= getVal(prev.sizes) ? curr : prev
                })
                if (largest.src) {
                  const upgraded = upgradeThumbnailUrl(
                    largest.src,
                    window.location.href,
                  )
                  if (upgraded) return upgraded
                }
              } catch (e) {}
            }

            // 3. YouTube Fallbacks
            if (
              window.location.href.includes("youtube.com") ||
              window.location.href.includes("youtu.be")
            ) {
              const ytMusicThumb =
                document.querySelector("ytmusic-player-bar img")?.src ||
                document.querySelector(".image.ytmusic-player-bar img")?.src ||
                document.querySelector("#thumbnail img")?.src
              if (ytMusicThumb)
                return upgradeThumbnailUrl(ytMusicThumb, window.location.href)

              const ytThumb =
                document.querySelector("img.ytp-videowall-still-image")?.src ||
                document.querySelector("img.yt-music-player-bar")?.src ||
                document
                  .querySelector(".ytp-cued-thumbnail-overlay-image")
                  ?.style.backgroundImage?.slice(5, -2)
              if (ytThumb)
                return upgradeThumbnailUrl(ytThumb, window.location.href)
            }

            // 4. Spotify Specific
            if (window.location.href.includes("spotify.com")) {
              const spotImg =
                document.querySelector('[data-testid="cover-art-image"]') ||
                document.querySelector('[data-testid="now-playing-widget"] img') ||
                document.querySelector(
                  '[data-testid="context-item-info-artwork"] img',
                ) ||
                document.querySelector(".cover-art img") ||
                document.querySelector('img[src*="scdn.co"]')
              const spotThumb = spotImg?.currentSrc || spotImg?.src
              if (spotThumb)
                return upgradeThumbnailUrl(spotThumb, window.location.href)
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
              if (zingThumb)
                return upgradeThumbnailUrl(zingThumb, window.location.href)
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
              if (soundCloudThumb)
                return upgradeThumbnailUrl(
                  soundCloudThumb,
                  window.location.href,
                )
            }

            if (window.location.href.includes("music.apple.com")) {
              const appleThumb =
                document.querySelector('[data-testid="artwork-component"] img')
                  ?.src ||
                document.querySelector(".web-chrome-playback-lcd__artwork img")
                  ?.src ||
                document.querySelector('img[src*="mzstatic.com"]')?.src
              if (appleThumb)
                return upgradeThumbnailUrl(appleThumb, window.location.href)
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
              if (nctThumb)
                return upgradeThumbnailUrl(nctThumb, window.location.href)
            }

            // Priority 4: Generic OG Image
            const ogImg = document.querySelector(
              'meta[property="og:image"]',
            )?.content
            if (ogImg) return upgradeThumbnailUrl(ogImg, window.location.href)

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

