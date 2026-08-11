/**
 * boot/updateCheck.js
 * Update notification: version comparison, modal display, update notes rendering.
 * Runs deferred (setTimeout 100ms) so it never blocks the critical boot path.
 */
import { geti18n } from "../services/i18n.js"
import { getSettings } from "../services/state.js"
import { fadeToggle } from "../utils/dom.js"

function setUpdateNoticePending(isPending) {
  window.startpageUpdateNoticePending = isPending
  if (!isPending) {
    window.dispatchEvent(new CustomEvent("startpage:updateNoticeSettled"))
  }
}

function isFirstRunOnboardingPending() {
  return (
    window.startpageFirstRunActive === true ||
    (localStorage.getItem("startpageFirstRunSvgBgV1") === "applied" &&
      localStorage.getItem("startpageFirstRunOnboardingDoneV1") !== "1")
  )
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

async function renderUpdateNotes() {
  const { getUpdateNotes } = await import("../data/updateNotes.js")
  const updateNotes = getUpdateNotes(getSettings().language)
  const changesTitle = document.getElementById("update-changes-title")
  const contributorsTitle = document.getElementById("update-contributors-title")
  const changesList = document.getElementById("update-change-list")
  const contributorList = document.getElementById("update-contributor-list")

  if (changesTitle)
    changesTitle.innerHTML = `<i class="fa-solid fa-star"></i> ${escapeHtml(updateNotes.changesTitle)}`
  if (contributorsTitle)
    contributorsTitle.innerHTML = `<i class="fa-solid fa-handshake"></i> ${escapeHtml(updateNotes.contributorsTitle)}`
  if (changesList)
    changesList.innerHTML = updateNotes.changes
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")
  if (contributorList)
    contributorList.innerHTML = updateNotes.contributors
      .map((item) => {
        const stats =
          item.badge || item.badgeLabel
            ? `<div class="update-contributor-stats"><span>${escapeHtml(item.badge)}</span><small>${escapeHtml(item.badgeLabel)}</small></div>`
            : ""
        return `<article class="update-contributor ${stats ? "" : "compact"}">
          <div class="update-contributor-main">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.project)}</span>
            <em>${escapeHtml(item.role)}</em>
          </div>
          ${stats}
          <p>${escapeHtml(item.note)}</p>
        </article>`
      })
      .join("")
}

function showUpdateUI(currentVersion, showModal, showArrow) {
  const popup = document.getElementById("update-notification-popup")
  const verLabel = document.getElementById("update-version-label")
  const sidebarLink = document.getElementById("sidebar-update-link")

  const storage = window.chrome?.storage?.local || {
    set: (obj) =>
      Object.keys(obj).forEach((k) => localStorage.setItem(k, obj[k])),
  }

  const acknowledgeUpdate = () => {
    if (popup) fadeToggle(popup, false, "block")
    storage.set({ updateModalAcknowledged: true })
    setUpdateNoticePending(false)
  }

  const showUpdateModal = async () => {
    if (!popup || !verLabel) return
    verLabel.textContent = `v${currentVersion}`
    await renderUpdateNotes()
    fadeToggle(popup, true, "block")
    document
      .getElementById("close-update-popup")
      ?.addEventListener("click", acknowledgeUpdate)
    document
      .getElementById("github-update-link")
      ?.addEventListener("click", acknowledgeUpdate)
  }

  if (showModal && popup && verLabel) {
    const isDialogActive = () =>
      isFirstRunOnboardingPending() ||
      document.body.classList.contains("first-run-tour-active") ||
      document.querySelector("#custom-dialog-overlay.active")

    const tryShowModal = () => {
      if (!isDialogActive()) {
        showUpdateModal()
        return
      }
      const obs = new MutationObserver(() => {
        if (!isDialogActive()) {
          obs.disconnect()
          showUpdateModal()
        }
      })
      obs.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
        subtree: false,
      })
      setTimeout(() => {
        obs.disconnect()
        if (!isDialogActive()) showUpdateModal()
      }, 5000)
    }
    tryShowModal()
  }

  if (showArrow && sidebarLink) {
    fadeToggle(sidebarLink, true, "flex")
  }
}

export function runUpdateCheck() {
  setUpdateNoticePending(true)

  setTimeout(() => {
    try {
      const manifest = window.chrome?.runtime?.getManifest?.()
      if (!manifest?.version) {
        setUpdateNoticePending(false)
        return
      }

      const currentVersion = manifest.version
      const storage = window.chrome?.storage?.local || {
        get: (keys, cb) => {
          const res = {}
          keys.forEach((k) => {
            const val = localStorage.getItem(k)
            res[k] = val === "true" ? true : val === "false" ? false : val
          })
          cb(res)
        },
        set: (obj) =>
          Object.keys(obj).forEach((k) => localStorage.setItem(k, obj[k])),
      }

      storage.get(
        ["lastVersion", "updateModalAcknowledged", "updateArrowTimestamp"],
        (result) => {
          let { lastVersion, updateModalAcknowledged, updateArrowTimestamp } =
            result
          if (typeof updateArrowTimestamp === "string")
            updateArrowTimestamp = parseInt(updateArrowTimestamp)

          const isFreshInstall =
            !lastVersion &&
            !localStorage.getItem("pageSettings") &&
            !localStorage.getItem("bookmarks")

          if (isFreshInstall) {
            storage.set({
              lastVersion: currentVersion,
              updateModalAcknowledged: true,
              updateArrowTimestamp: 0,
            })
            setUpdateNoticePending(false)
            return
          }

          if (!lastVersion || lastVersion !== currentVersion) {
            updateModalAcknowledged = false
            updateArrowTimestamp = Date.now()
            storage.set({
              lastVersion: currentVersion,
              updateModalAcknowledged,
              updateArrowTimestamp,
            })
          }

          const showModal = updateModalAcknowledged !== true
          const now = Date.now()
          const hour = 3600000
          const showArrow =
            updateArrowTimestamp && now - updateArrowTimestamp < hour

          if (showModal || showArrow)
            showUpdateUI(currentVersion, showModal, showArrow)
          if (!showModal) setUpdateNoticePending(false)

          if (showArrow) {
            const timeLeft = hour - (now - updateArrowTimestamp)
            setTimeout(() => {
              const sidebarLink = document.getElementById("sidebar-update-link")
              if (sidebarLink) fadeToggle(sidebarLink, false, "flex")
            }, timeLeft)
          }
        },
      )
    } catch (e) {
      console.warn("Update check failed:", e)
      setUpdateNoticePending(false)
    }

    window.addEventListener("startpage:languageChanged", () => {
      const popup = document.getElementById("update-notification-popup")
      if (!popup || window.getComputedStyle(popup).display === "none") return
      void renderUpdateNotes()
    })
  }, 100)
}
