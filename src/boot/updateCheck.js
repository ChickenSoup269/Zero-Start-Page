/**
 * boot/updateCheck.js
 * Update notification: version comparison, modal display, update notes rendering.
 * Runs deferred (setTimeout 100ms) so it never blocks the critical boot path.
 */
import { applyTranslations, geti18n } from "../services/i18n.js"
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

function getInitials(name) {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatChangeItem(rawText) {
  const text = String(rawText || "").trim()
  let type = "feat"
  let rest = text

  if (/^\[FEAT\]/i.test(rest) || /^FEAT:/i.test(rest)) {
    type = "feat"
    rest = rest.replace(/^\[FEAT\]\s*|^FEAT:\s*/i, "").trim()
  } else if (/^\[FIX\]/i.test(rest) || /^FIX:/i.test(rest)) {
    type = "fix"
    rest = rest.replace(/^\[FIX\]\s*|^FIX:\s*/i, "").trim()
  } else if (/^(performance|ui\/ux|fix|bug|sửa lỗi|tối ưu)/i.test(rest)) {
    type = "fix"
  }

  const colonIdx = rest.indexOf(":")
  if (colonIdx > 0 && colonIdx < 60) {
    const title = rest.slice(0, colonIdx).trim()
    const desc = rest.slice(colonIdx + 1).trim()
    const tagBadge = `<span class="update-chip chip-${type}">${escapeHtml(type.toUpperCase())}</span>`

    return `<li class="update-change-item">
      <div class="update-change-head">
        ${tagBadge}
        <strong class="update-change-title">${escapeHtml(title)}</strong>
      </div>
      <p class="update-change-desc">${escapeHtml(desc)}</p>
    </li>`
  }

  const tagBadge = `<span class="update-chip chip-${type}">${escapeHtml(type.toUpperCase())}</span>`

  return `<li class="update-change-item">
    <div class="update-change-head">
      ${tagBadge}
      <span class="update-change-desc inline-desc">${escapeHtml(rest)}</span>
    </div>
  </li>`
}

async function renderUpdateNotes() {
  const { getUpdateNotes } = await import("../data/updateNotes.js")
  const updateNotes = getUpdateNotes(getSettings().language)
  const changesTitle = document.getElementById("update-changes-title")
  const contributorsTitle = document.getElementById("update-contributors-title")
  const changesList = document.getElementById("update-change-list")
  const contributorList = document.getElementById("update-contributor-list")

  if (changesTitle)
    changesTitle.textContent = updateNotes.changesTitle
  if (contributorsTitle)
    contributorsTitle.textContent = updateNotes.contributorsTitle
  const contributorsSection = contributorsTitle?.closest(".update-popup-section")
  const hasContributors = Array.isArray(updateNotes.contributors) && updateNotes.contributors.length > 0

  if (contributorsSection) {
    contributorsSection.style.display = hasContributors ? "" : "none"
  }

  if (changesList)
    changesList.innerHTML = updateNotes.changes
      .map((item) => formatChangeItem(item))
      .join("")

  if (contributorList) {
    if (hasContributors) {
      contributorList.innerHTML = updateNotes.contributors
        .map((item) => {
          const initials = getInitials(item.name)
          const stats =
            item.badge || item.badgeLabel
              ? `<div class="update-contributor-stats"><span class="contrib-badge">${escapeHtml(item.badge)}</span><small>${escapeHtml(item.badgeLabel)}</small></div>`
              : ""
          return `<article class="update-contributor-card">
            <div class="update-contributor-head">
              <div class="update-contributor-avatar">${escapeHtml(initials)}</div>
              <div class="update-contributor-meta">
                <strong class="update-contributor-name">${escapeHtml(item.name)}</strong>
                <div class="update-contributor-tags">
                  <span class="contrib-project">${escapeHtml(item.project || "Zero Startpage")}</span>
                  <span class="contrib-role">${escapeHtml(item.role || "Contributor")}</span>
                </div>
              </div>
              ${stats}
            </div>
            ${item.note ? `<div class="update-contributor-quote"><p>${escapeHtml(item.note)}</p></div>` : ""}
          </article>`
        })
        .join("")
    } else {
      contributorList.innerHTML = ""
    }
  }
}

function showUpdateUI(currentVersion, showModal, showArrow) {
  const popup = document.getElementById("update-notification-popup")
  const verLabel = document.getElementById("update-version-label")
  const sidebarLink = document.getElementById("sidebar-update-link")

  const storage = window.chrome?.storage?.local || {
    set: (obj) =>
      Object.keys(obj).forEach((k) => localStorage.setItem(k, obj[k])),
  }

  let onKeyDown = null

  const acknowledgeUpdate = () => {
    if (popup) fadeToggle(popup, false, "flex")
    storage.set({ updateModalAcknowledged: true })
    setUpdateNoticePending(false)
    if (onKeyDown) {
      document.removeEventListener("keydown", onKeyDown)
      onKeyDown = null
    }
  }

  const showUpdateModal = async () => {
    if (!popup || !verLabel) return
    verLabel.textContent = `v${currentVersion}`
    try {
      applyTranslations(popup)
    } catch (_) {}
    await renderUpdateNotes()
    fadeToggle(popup, true, "flex")
    document
      .getElementById("close-update-popup")
      ?.addEventListener("click", acknowledgeUpdate, { once: true })
    document
      .getElementById("close-update-popup-x")
      ?.addEventListener("click", acknowledgeUpdate, { once: true })
    document
      .getElementById("github-update-link")
      ?.addEventListener("click", acknowledgeUpdate, { once: true })

    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        acknowledgeUpdate()
      }
    })

    onKeyDown = (e) => {
      if (e.key === "Escape") {
        acknowledgeUpdate()
      }
    }
    document.addEventListener("keydown", onKeyDown)
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
