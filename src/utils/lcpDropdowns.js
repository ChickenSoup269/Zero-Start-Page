import { geti18n } from "../services/i18n.js"
import { getSettings } from "../services/state.js"

function getShowLessText() {
  const i18n = geti18n()
  if (i18n && i18n.themes_show_less) return i18n.themes_show_less
  const lang = getSettings()?.language || "en"
  return lang === "vi" ? "Thu gọn" : "Show less"
}

export function initLcpCustomDropdowns() {
  const popup = document.getElementById("layout-controls-popup")
  if (!popup) return

  const selects = popup.querySelectorAll("select.lcp-select")
  selects.forEach((select) => {
    setupLcpButtonGroup(select)
  })
}

export function syncLcpCustomDropdown(select) {
  if (!select) return
  const wrapper = select.closest(".lcp-btn-group-wrapper")
  if (!wrapper) return

  const currentVal = select.value
  const badge = wrapper.querySelector(".lcp-selected-badge")
  const buttons = wrapper.querySelectorAll(".lcp-btn-chip")

  let activeBtn = null
  buttons.forEach((btn) => {
    const isSelected = btn.dataset.value === currentVal
    btn.classList.toggle("active", isSelected)
    if (isSelected) activeBtn = btn
  })

  if (activeBtn && badge) {
    const textEl = activeBtn.querySelector(".lcp-chip-text") || activeBtn
    badge.textContent = textEl.textContent.trim()
    if (textEl.hasAttribute("data-i18n")) {
      badge.setAttribute("data-i18n", textEl.getAttribute("data-i18n"))
    } else {
      badge.removeAttribute("data-i18n")
    }
  }
}

function setupLcpButtonGroup(select) {
  if (select.dataset.lcpBtnGroupInitialized === "true") {
    syncLcpCustomDropdown(select)
    return
  }

  // Find parent row
  const row = select.closest(".lcp-row") || select.parentElement
  row.classList.add("lcp-row-segmented")

  // Hide the native select
  select.style.display = "none"
  select.dataset.lcpBtnGroupInitialized = "true"

  // Create wrapper
  let wrapper = select.closest(".lcp-btn-group-wrapper")
  if (!wrapper) {
    wrapper = document.createElement("div")
    wrapper.className = "lcp-btn-group-wrapper"
    select.parentNode.insertBefore(wrapper, select)
    wrapper.appendChild(select)
  }

  // Check type
  const isRadius = select.classList.contains("quick-access-radius-select")
  const totalOptions = select.options.length
  const isLongList = totalOptions > 8 && !isRadius

  // Create Header with title, current value badge, and toggle chevron
  const header = document.createElement("div")
  header.className = "lcp-group-header"
  header.setAttribute("role", "button")
  header.setAttribute("tabindex", "0")
  header.setAttribute("aria-expanded", "true")

  const labelEl = row.querySelector(".lcp-label")
  const iconEl = row.querySelector(".lcp-icon")

  const titleWrap = document.createElement("div")
  titleWrap.className = "lcp-group-title"
  if (iconEl) titleWrap.appendChild(iconEl.cloneNode(true))
  if (labelEl) titleWrap.appendChild(labelEl.cloneNode(true))

  // Hide original label & icon in row to avoid duplicates
  if (iconEl) iconEl.style.display = "none"
  if (labelEl) labelEl.style.display = "none"

  const headerRight = document.createElement("div")
  headerRight.className = "lcp-header-right"

  const badge = document.createElement("span")
  badge.className = "lcp-selected-badge"

  const chevron = document.createElement("i")
  chevron.className = "fa-solid fa-chevron-down lcp-group-chevron"

  headerRight.appendChild(badge)
  headerRight.appendChild(chevron)

  header.appendChild(titleWrap)
  header.appendChild(headerRight)

  // Content wrapper for collapsible animation
  const contentWrapper = document.createElement("div")
  contentWrapper.className = "lcp-group-content"

  // Restore saved collapse/expand state from localStorage
  const selectId = select.id || select.name
  const isStoredCollapsed = selectId && localStorage.getItem("lcp_collapsed_" + selectId) === "true"
  if (isStoredCollapsed) {
    wrapper.classList.add("is-collapsed")
    header.setAttribute("aria-expanded", "false")
  }

  // Buttons container
  const btnContainer = document.createElement("div")
  btnContainer.className = `lcp-btn-group ${isRadius ? "is-radius-grid" : "is-chips-wrap"}`

  const MAX_INITIAL = 6
  let hasCollapsedItems = false

  Array.from(select.options).forEach((opt, index) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "lcp-btn-chip"
    btn.dataset.value = opt.value

    const textSpan = document.createElement("span")
    textSpan.className = "lcp-chip-text"
    textSpan.textContent = opt.textContent
    if (opt.hasAttribute("data-i18n")) {
      textSpan.setAttribute("data-i18n", opt.getAttribute("data-i18n"))
    }
    btn.appendChild(textSpan)

    // For long list (e.g. music styles), mark overflow items
    if (isLongList && index >= MAX_INITIAL) {
      btn.classList.add("lcp-chip-extra")
      hasCollapsedItems = true
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation()
      if (select.value !== opt.value) {
        select.value = opt.value
        select.dispatchEvent(new Event("change", { bubbles: true }))
      }
      syncLcpCustomDropdown(select)
    })

    btnContainer.appendChild(btn)
  })

  // Add toggle button for long list if needed
  if (hasCollapsedItems) {
    btnContainer.classList.add("has-overflow")
    const isChipsExpanded =
      selectId &&
      localStorage.getItem("lcp_chips_expanded_" + selectId) === "true"
    if (!isChipsExpanded) {
      btnContainer.classList.add("is-collapsed")
    }

    const toggleMoreBtn = document.createElement("button")
    toggleMoreBtn.type = "button"
    toggleMoreBtn.className = "lcp-btn-chip lcp-toggle-more-btn"
    if (isChipsExpanded) {
      toggleMoreBtn.innerHTML = `<span data-i18n="themes_show_less">${getShowLessText()}</span> <i class="fa-solid fa-chevron-up"></i>`
    } else {
      toggleMoreBtn.innerHTML = `<span>+ ${totalOptions - MAX_INITIAL}</span> <i class="fa-solid fa-chevron-down"></i>`
    }

    toggleMoreBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      const isCollapsed = btnContainer.classList.toggle("is-collapsed")
      if (isCollapsed) {
        toggleMoreBtn.innerHTML = `<span>+ ${totalOptions - MAX_INITIAL}</span> <i class="fa-solid fa-chevron-down"></i>`
      } else {
        toggleMoreBtn.innerHTML = `<span data-i18n="themes_show_less">${getShowLessText()}</span> <i class="fa-solid fa-chevron-up"></i>`
      }
      if (selectId) {
        try {
          localStorage.setItem(
            "lcp_chips_expanded_" + selectId,
            isCollapsed ? "false" : "true",
          )
        } catch (_) {}
      }
    })

    btnContainer.appendChild(toggleMoreBtn)
  }

  contentWrapper.appendChild(btnContainer)

  // Toggle Collapse / Expand on Header click & persist in localStorage
  const toggleGroup = (e) => {
    e.stopPropagation()
    const isCurrentlyCollapsed = wrapper.classList.toggle("is-collapsed")
    header.setAttribute("aria-expanded", isCurrentlyCollapsed ? "false" : "true")
    if (selectId) {
      try {
        localStorage.setItem("lcp_collapsed_" + selectId, isCurrentlyCollapsed ? "true" : "false")
      } catch (_) {}
    }
  }

  header.addEventListener("click", toggleGroup)
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleGroup(e)
    }
  })

  // Clear previous and assemble
  wrapper.innerHTML = ""
  wrapper.appendChild(header)
  wrapper.appendChild(contentWrapper)
  wrapper.appendChild(select)

  // Sync on change
  select.addEventListener("change", () => {
    syncLcpCustomDropdown(select)
  })

  syncLcpCustomDropdown(select)
}
