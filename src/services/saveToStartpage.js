// Receives "Save to Startpage" items queued by the background worker
// (browser right-click menu) and merges them into the RSS Read later list.
import { geti18n } from "./i18n.js"
import { showToast } from "../utils/toast.js"

const WEB_SAVE_QUEUE_KEY = "startpageWebSaveQueue"
const READ_LATER_KEY = "rssReadLater"
const MAX_READ_LATER_ITEMS = 100

function flushQueue(queue) {
  if (!Array.isArray(queue) || queue.length === 0) return
  let saved = []
  try {
    saved = JSON.parse(localStorage.getItem(READ_LATER_KEY) || "[]")
    if (!Array.isArray(saved)) saved = []
  } catch (e) {
    saved = []
  }

  let added = 0
  let duplicate = false
  for (const item of queue) {
    if (!item || !item.link) continue
    if (saved.some((a) => a.link === item.link)) {
      duplicate = true
      continue
    }
    saved.push(item)
    added++
  }

  if (added === 0 && !duplicate) return
  localStorage.setItem(
    READ_LATER_KEY,
    JSON.stringify(saved.slice(-MAX_READ_LATER_ITEMS)),
  )
  window.dispatchEvent(new CustomEvent("rssReadLaterChanged"))

  const i18n = geti18n()
  if (added > 0) {
    showToast(i18n.save_to_startpage_done || "Saved to Read later")
  } else {
    showToast(i18n.save_to_startpage_exists || "Already in Read later")
  }
}

function consumeQueue(queue) {
  flushQueue(queue)
  try {
    chrome.storage.local.remove(WEB_SAVE_QUEUE_KEY)
  } catch (e) {}
}

export function initSaveToStartpage() {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[WEB_SAVE_QUEUE_KEY]) return
    const queue = changes[WEB_SAVE_QUEUE_KEY].newValue
    if (!queue || queue.length === 0) return
    consumeQueue(queue)
  })
  // Flush items saved while the startpage was closed
  chrome.storage.local.get(WEB_SAVE_QUEUE_KEY, (data) => {
    const queue = data?.[WEB_SAVE_QUEUE_KEY]
    if (queue && queue.length > 0) consumeQueue(queue)
  })
}
