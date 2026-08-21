// Offscreen Document: Captures tab audio and computes frequency bands via Web Audio API

let audioCtx = null
let mediaStream = null
let analyserNode = null
let animationFrameId = null
let broadcastChannel = null
let activeStreamId = null

function getBroadcastChannel() {
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel("startpage_real_audio_channel")
  }
  return broadcastChannel
}

async function startCapture(streamId) {
  if (activeStreamId === streamId && audioCtx && audioCtx.state === "running") {
    return
  }

  stopCapture()
  activeStreamId = streamId
  const channel = getBroadcastChannel()

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    })

    mediaStream = stream
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    audioCtx = new AudioContextClass()

    if (audioCtx.state === "suspended") {
      await audioCtx.resume()
    }

    const source = audioCtx.createMediaStreamSource(stream)

    // Route audio to destination so the user continues hearing the tab
    source.connect(audioCtx.destination)

    // Analyser setup
    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = 64
    analyserNode.smoothingTimeConstant = 0.65
    source.connect(analyserNode)

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    channel.postMessage({
      type: "AUDIO_DEBUG",
      status: "STREAM_CAPTURED",
      tracks: stream.getAudioTracks().length,
      sampleRate: audioCtx.sampleRate,
    })

    let lastSendTs = 0

    function tick(ts) {
      if (!analyserNode) return
      animationFrameId = requestAnimationFrame(tick)

      // Send updates ~45fps for smooth responsive bounce
      if (ts - lastSendTs < 22) return
      lastSendTs = ts

      analyserNode.getByteFrequencyData(dataArray)

      // Normalize into distinct frequency bands
      // Band 0: Sub-bass (Kick)
      // Band 1: Bass
      // Band 2: Low-Mid
      // Band 3: Mid
      // Band 4: Mid-High
      // Band 5: High
      const b0 = (dataArray[0] || 0) / 255
      const b1 = (dataArray[1] || 0) / 255
      const b2 = ((dataArray[2] || 0) + (dataArray[3] || 0)) / 510
      const b3 = ((dataArray[4] || 0) + (dataArray[5] || 0)) / 510
      const b4 = ((dataArray[6] || 0) + (dataArray[7] || 0) + (dataArray[8] || 0)) / (3 * 255)
      const b5 = ((dataArray[9] || 0) + (dataArray[10] || 0) + (dataArray[11] || 0)) / (3 * 255)

      const bands = [
        Math.round(b0 * 1000) / 1000,
        Math.round(b1 * 1000) / 1000,
        Math.round(b2 * 1000) / 1000,
        Math.round(b3 * 1000) / 1000,
        Math.round(b4 * 1000) / 1000,
        Math.round(b5 * 1000) / 1000,
      ]

      try {
        channel.postMessage({
          type: "AUDIO_BANDS",
          bands,
          timestamp: ts,
        })
      } catch (e) {}

      try {
        chrome.runtime?.sendMessage({
          type: "AUDIO_BANDS",
          bands,
        })?.catch?.(() => {})
      } catch (e) {}
    }

    animationFrameId = requestAnimationFrame(tick)
  } catch (err) {
    console.warn("[Offscreen Audio] Failed to capture stream:", err)
    channel.postMessage({
      type: "AUDIO_DEBUG",
      status: "CAPTURE_FAILED",
      error: String(err?.message || err),
    })
    stopCapture()
  }
}

function stopCapture() {
  activeStreamId = null
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
  if (analyserNode) {
    analyserNode.disconnect()
    analyserNode = null
  }
  if (audioCtx) {
    try {
      audioCtx.close()
    } catch (e) {}
    audioCtx = null
  }
  try {
    getBroadcastChannel().postMessage({
      type: "AUDIO_BANDS_STOP",
    })
  } catch (e) {}
  try {
    chrome.runtime?.sendMessage({
      type: "AUDIO_BANDS_STOP",
    })?.catch?.(() => {})
  } catch (e) {}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== "offscreen") return

  if (message.type === "START_AUDIO_CAPTURE") {
    startCapture(message.streamId)
    sendResponse({ status: "started" })
  } else if (message.type === "STOP_AUDIO_CAPTURE") {
    stopCapture()
    sendResponse({ status: "stopped" })
  }
})
