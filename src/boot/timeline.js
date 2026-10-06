/**
 * boot/timeline.js
 * Boot timeline instrumentation: performance.mark() at boot milestones plus a
 * console report of the phases. Enabled with the ?perf URL param or the
 * startpagePerfTimeline=1 localStorage flag.
 *
 * preload.js is a classic script and cannot import this module — it marks
 * "preload-start"/"preload-done" with raw performance.mark() calls.
 */

const REPORT_FLAG = "startpagePerfTimeline"

// Display order for the report; milestones missing from a given boot are skipped
const MILESTONE_ORDER = [
  "preload-start",
  "preload-done",
  "bootstrap-start",
  "main-start",
  "i18n-done",
  "bookmarks-ready",
  "bg-ready",
  "revealed",
]

export function bootMark(name) {
  try {
    performance.mark(`boot:${name}`)
  } catch {}
}

export function isBootTimelineEnabled() {
  try {
    if (new URLSearchParams(window.location.search).has("perf")) return true
    return localStorage.getItem(REPORT_FLAG) === "1"
  } catch {
    return false
  }
}

export function reportBootTimeline() {
  if (!isBootTimelineEnabled()) return
  try {
    const rows = []
    let prev = null
    for (const name of MILESTONE_ORDER) {
      const entry = performance.getEntriesByName(`boot:${name}`)[0]
      if (!entry) continue
      rows.push({
        milestone: name,
        "ms since navigation": Math.round(entry.startTime),
        delta: prev === null ? "" : `+${Math.round(entry.startTime - prev)}ms`,
      })
      prev = entry.startTime
    }
    console.table(rows)
  } catch {}
}
