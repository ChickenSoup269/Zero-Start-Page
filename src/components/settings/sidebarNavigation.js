/**
 * Settings Sidebar Navigation & Live Search Module
 * Provides tab-based category filtering and instant search for the settings sidebar
 */

const STORAGE_KEY_ACTIVE_TAB = "startpage_settings_active_tab"
const DEFAULT_TAB = "appearance"

// Mapping of section IDs / selectors to tabs in case data-settings-tab is not on partial
const SECTION_TAB_MAP = {
  // Appearance
  "themes": "appearance",
  "font": "appearance",
  "custom-title": "appearance",
  "page-title-group": "appearance",
  
  // Background & FX
  "background": "background",
  "gradient-multi-color": "background",
  "animated-backgrounds": "background",
  "special-effects": "background",
  
  // Clock & Date
  "date-clock": "clock",
  
  // Bookmarks
  "bookmark-custom": "bookmarks",
  
  // Widgets & Layout
  "layout": "widgets",
  
  // System & Data
  "language-setting-group": "system",
  "data-sync": "system",
  "about-project": "system"
}

const STORAGE_KEY_BG_SUBTAB = "startpage_bg_active_subtab"
const DEFAULT_BG_SUBTAB = "media"

let activeTab = DEFAULT_TAB
let activeBgSubTab = DEFAULT_BG_SUBTAB
let isSearchMode = false
let searchTimeout = null
const searchExpandedSections = new Set()

// Load saved subtab
try {
  const savedBgSubTab = localStorage.getItem(STORAGE_KEY_BG_SUBTAB)
  if (savedBgSubTab && ["media", "colors", "animated", "adjust"].includes(savedBgSubTab)) {
    activeBgSubTab = savedBgSubTab
  }
} catch (e) {
  activeBgSubTab = DEFAULT_BG_SUBTAB
}

/**
 * Determine which tab an element belongs to
 */
export function getElementTab(el) {
  if (!el) return null
  
  // Direct attribute
  const directTab = el.getAttribute("data-settings-tab")
  if (directTab) return directTab
  
  // By section ID
  const sectionId = el.getAttribute("data-section-id") || el.id
  if (sectionId && SECTION_TAB_MAP[sectionId]) {
    return SECTION_TAB_MAP[sectionId]
  }

  // By partial name
  const partialName = el.getAttribute("data-settings-partial")
  if (partialName && SECTION_TAB_MAP[partialName]) {
    return SECTION_TAB_MAP[partialName]
  }

  // Check specific class or ID
  if (el.classList?.contains("language-setting-group") || el.closest?.(".language-setting-group") || el.id === "language-select") return "system"
  if (el.querySelector?.("#page-title-input") || el.closest?.("#page-title-group") || el.id === "page-title-input") return "appearance"
  if (el.closest?.("#accent-color-group") || el.id === "accent-color-group") return "background"
  
  // Check closest element with data-settings-tab
  const closestTab = el.closest("[data-settings-tab]")
  if (closestTab) {
    return closestTab.getAttribute("data-settings-tab")
  }

  // Check closest section
  const closestSection = el.closest(".settings-section, .setting-group")
  if (closestSection) {
    const parentSectionId = closestSection.getAttribute("data-section-id") || closestSection.id
    if (parentSectionId && SECTION_TAB_MAP[parentSectionId]) {
      return SECTION_TAB_MAP[parentSectionId]
    }
  }

  return null
}

const SECTION_BG_SUBTAB_MAP = {
  "background": "media",
  "gradient-multi-color": "colors",
  "accent-color-group": "colors",
  "animated-backgrounds": "animated",
  "special-effects": "animated"
}

/**
 * Determine which background subtab an element belongs to
 */
export function getElementBgSubTab(el) {
  if (!el) return null
  const direct = el.getAttribute("data-bg-subtab")
  if (direct) return direct
  const closest = el.closest("[data-bg-subtab]")
  if (closest) return closest.getAttribute("data-bg-subtab")

  const sectionId = el.getAttribute("data-section-id") || el.id
  if (sectionId && SECTION_BG_SUBTAB_MAP[sectionId]) {
    return SECTION_BG_SUBTAB_MAP[sectionId]
  }

  const closestSection = el.closest(".settings-section, .setting-group, .bg-control-card")
  if (closestSection) {
    const parentSubTab = closestSection.getAttribute("data-bg-subtab")
    if (parentSubTab) return parentSubTab

    const parentSectionId = closestSection.getAttribute("data-section-id") || closestSection.id
    if (parentSectionId && SECTION_BG_SUBTAB_MAP[parentSectionId]) {
      return SECTION_BG_SUBTAB_MAP[parentSectionId]
    }
  }

  return null
}

/**
 * Scroll sidebar to a specific element with accurate nav offset & highlight
 */
export function scrollToSidebarElement(element, highlight = true) {
  const sidebar = document.getElementById("settings-sidebar")
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  if (!sidebar || !sidebarContent || !element) return

  // 0. Ensure sidebar is open
  sidebar.classList.add("open")

  // 1. Ensure target Tab is activated
  const targetTab = getElementTab(element)
  if (targetTab && targetTab !== activeTab) {
    switchSettingsTab(targetTab)
  }

  // 2. If target is in Background tab, ensure target SubTab is activated
  if (targetTab === "background" || activeTab === "background") {
    const targetSubTab = getElementBgSubTab(element) || DEFAULT_BG_SUBTAB
    if (targetSubTab && targetSubTab !== activeBgSubTab) {
      switchBgSubTab(targetSubTab)
    }
  }

  // 3. Expand parent section if collapsed
  const parentSection = element.closest(".settings-section")
  if (parentSection && parentSection.classList.contains("collapsed")) {
    parentSection.classList.remove("collapsed")
    const sectionId = parentSection.dataset.sectionId
    if (sectionId) {
      try {
        const states = JSON.parse(localStorage.getItem("settingsSectionStates") || "{}")
        states[sectionId] = false
        localStorage.setItem("settingsSectionStates", JSON.stringify(states))
      } catch (e) {}
    }
  }

  // 4. Expand collapsible group if element is or is inside one
  const collGroup = element.closest(".collapsible-group")
  if (collGroup && !collGroup.classList.contains("expanded")) {
    collGroup.classList.remove("collapsed")
    collGroup.classList.add("expanded")
    const groupId = collGroup.id || collGroup.dataset.groupId
    if (groupId) {
      try {
        localStorage.setItem(`settingsGroupExpanded:${groupId}`, "1")
      } catch (e) {}
    }
  }

  // 5. Accurate scroll calculation after layout settles
  const performScroll = () => {
    const currentSidebar = sidebar.querySelector(".sidebar-content") || sidebarContent
    if (!currentSidebar || !element) return

    const sidebarRect = currentSidebar.getBoundingClientRect()
    const elemRect = element.getBoundingClientRect()
    const navContainer = document.querySelector(".settings-nav-container")
    const navOffset = navContainer && !navContainer.classList.contains("nav-hidden")
      ? (navContainer.offsetHeight || 110)
      : 10

    const targetPixel = Math.max(
      0,
      elemRect.top - sidebarRect.top + currentSidebar.scrollTop - navOffset - 14
    )

    currentSidebar.scrollTo({
      top: targetPixel,
      behavior: "smooth",
    })

    if (highlight) {
      const highlightTarget =
        element.closest(".setting-item-row, .setting-item, .bg-control-card, .preset-theme-card, .collapsible-group") ||
        element.querySelector(".section-toggle") ||
        element
      highlightTarget.classList.remove("settings-scroll-highlight")
      void highlightTarget.offsetWidth // Trigger reflow
      highlightTarget.classList.add("settings-scroll-highlight")
      setTimeout(() => {
        highlightTarget.classList.remove("settings-scroll-highlight")
      }, 1800)
    }
  }

  requestAnimationFrame(() => {
    setTimeout(performScroll, 80)
  })
}

/**
 * Switch active background subtab
 */
export function switchBgSubTab(subTabId, targetElementToScrollTo = null) {
  const sidebar = document.getElementById("settings-sidebar")
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  if (!sidebar || !sidebarContent) return

  activeBgSubTab = subTabId || DEFAULT_BG_SUBTAB
  try {
    localStorage.setItem(STORAGE_KEY_BG_SUBTAB, activeBgSubTab)
  } catch (e) {
    // Ignore storage quota errors
  }

  // Update subtab buttons
  const subTabButtons = sidebar.querySelectorAll(".bg-subtab-btn")
  subTabButtons.forEach((btn) => {
    const isSelected = btn.getAttribute("data-bg-subtab") === activeBgSubTab
    btn.classList.toggle("active", isSelected)
    btn.setAttribute("aria-selected", isSelected ? "true" : "false")
  })

  // Apply visibility filtering to all elements with data-bg-subtab
  const subTabElements = sidebar.querySelectorAll("[data-bg-subtab]")
  subTabElements.forEach((el) => {
    // Skip the subtab buttons themselves
    if (el.classList.contains("bg-subtab-btn")) return
    const elSubTab = el.getAttribute("data-bg-subtab")
    if (elSubTab === activeBgSubTab) {
      el.classList.remove("bg-subtab-hidden")
    } else {
      el.classList.add("bg-subtab-hidden")
    }
  })

  // Handle the parent .settings-section[data-section-id="background"]
  const bgSection = sidebar.querySelector('.settings-section[data-section-id="background"]')
  if (bgSection) {
    if (activeBgSubTab === "media" || activeBgSubTab === "adjust") {
      bgSection.classList.remove("bg-subtab-hidden")
    } else {
      bgSection.classList.add("bg-subtab-hidden")
    }
  }

  // Scroll
  if (targetElementToScrollTo && targetElementToScrollTo instanceof HTMLElement) {
    scrollToSidebarElement(targetElementToScrollTo)
  } else {
    sidebarContent.scrollTo({ top: 0, behavior: "smooth" })
  }
}

/**
 * Get all top-level setting containers inside .sidebar-content
 */
function getTopLevelSettingElements(sidebarContent) {
  if (!sidebarContent) return []
  return Array.from(
    sidebarContent.querySelectorAll(
      ":scope > .settings-section, :scope > .setting-group, :scope > .bg-subtab-nav, :scope > [data-settings-partial], :scope > [data-settings-tab]"
    )
  )
}

/**
 * Switch active tab
 */
export function switchSettingsTab(tabId, targetElementToScrollTo = null) {
  const sidebar = document.getElementById("settings-sidebar")
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  const tabButtons = sidebar?.querySelectorAll(".settings-tab-btn")
  const searchInput = document.getElementById("settings-search-input")

  if (!sidebar || !sidebarContent) return

  // If there's an ongoing search, clear it when explicitly switching tab
  if (searchInput && searchInput.value.trim().length > 0 && !targetElementToScrollTo) {
    searchInput.value = ""
    exitSearchMode()
  }

  activeTab = tabId || DEFAULT_TAB
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTab)
  } catch (e) {
    // Ignore storage quota errors
  }

  sidebar.setAttribute("data-active-tab", activeTab)

  // Update tab buttons
  tabButtons?.forEach((btn) => {
    const isSelected = btn.getAttribute("data-tab") === activeTab
    btn.classList.toggle("active", isSelected)
    btn.setAttribute("aria-selected", isSelected ? "true" : "false")
  })

  // Apply visibility to top-level elements
  const topElements = getTopLevelSettingElements(sidebarContent)
  topElements.forEach((el) => {
    const elTab = getElementTab(el)
    if (!elTab || elTab === activeTab) {
      el.classList.remove("settings-tab-hidden")
    } else {
      el.classList.add("settings-tab-hidden")
    }
  })

  // Ensure bg-subtab-nav visibility is in sync with background tab
  const bgSubTabNav = sidebar.querySelector(".bg-subtab-nav")
  if (bgSubTabNav) {
    if (activeTab === "background") {
      bgSubTabNav.classList.remove("settings-tab-hidden")
    } else {
      bgSubTabNav.classList.add("settings-tab-hidden")
    }
  }

  // If active tab is background, apply subtab filtering
  if (activeTab === "background") {
    if (targetElementToScrollTo && targetElementToScrollTo instanceof HTMLElement) {
      const targetSubTab = getElementBgSubTab(targetElementToScrollTo)
      if (targetSubTab) {
        switchBgSubTab(targetSubTab, targetElementToScrollTo)
      } else {
        switchBgSubTab(activeBgSubTab, targetElementToScrollTo)
      }
    } else {
      switchBgSubTab(activeBgSubTab)
    }
  } else if (targetElementToScrollTo && targetElementToScrollTo instanceof HTMLElement) {
    scrollToSidebarElement(targetElementToScrollTo)
  } else {
    sidebarContent.scrollTo({ top: 0, behavior: "instant" })
  }
}

/**
 * Normalize text for searching
 */
function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

/**
 * Live search handler
 */
function handleSettingsSearch(query) {
  const sidebar = document.getElementById("settings-sidebar")
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  const clearBtn = document.getElementById("settings-search-clear")
  const emptyState = document.getElementById("settings-search-empty")
  const emptyText = document.getElementById("settings-search-empty-text")

  if (!sidebar || !sidebarContent) return

  const normalizedQuery = normalizeText(query)

  if (clearBtn) {
    clearBtn.hidden = normalizedQuery.length === 0
  }

  if (normalizedQuery.length === 0) {
    exitSearchMode()
    return
  }

  isSearchMode = true
  sidebar.setAttribute("data-search-mode", "true")

  // Make all top-level items and background subtab items available for searching
  const topElements = getTopLevelSettingElements(sidebarContent)
  topElements.forEach((el) => el.classList.remove("settings-tab-hidden"))

  sidebar.querySelectorAll(".bg-subtab-hidden").forEach((el) => {
    el.classList.remove("bg-subtab-hidden")
  })

  let totalMatches = 0

  // Search through all sections & sub-groups
  const sections = Array.from(sidebarContent.querySelectorAll(".settings-section"))
  const standaloneGroups = Array.from(
    sidebarContent.querySelectorAll(":scope > .setting-group")
  )

  // 1. Process Standalone Groups (Language, Page Title, etc.)
  standaloneGroups.forEach((group) => {
    const textContent = normalizeText(group.textContent)
    const matches = textContent.includes(normalizedQuery)
    group.classList.toggle("settings-search-hidden", !matches)
    if (matches) totalMatches++
  })

  // 2. Process Sections & Their Children
  sections.forEach((section) => {
    const sectionToggle = section.querySelector(".section-toggle")
    const sectionHeaderMatch = sectionToggle && normalizeText(sectionToggle.textContent).includes(normalizedQuery)

    // Check individual groups and rows inside the section
    const subGroups = Array.from(
      section.querySelectorAll(".setting-group, .bg-control-card, .setting-item-row, .preset-theme-card")
    )

    let sectionHasSubMatch = false

    subGroups.forEach((subGroup) => {
      const subText = normalizeText(subGroup.textContent)
      const subMatches = sectionHeaderMatch || subText.includes(normalizedQuery)
      subGroup.classList.toggle("settings-search-hidden", !subMatches)
      if (subMatches) {
        sectionHasSubMatch = true
        totalMatches++
      }
    })

    const isSectionVisible = sectionHeaderMatch || sectionHasSubMatch
    section.classList.toggle("settings-search-hidden", !isSectionVisible)

    // If section matches or has matching children and was collapsed, expand it temporarily
    if (isSectionVisible) {
      if (section.classList.contains("collapsed")) {
        section.classList.remove("collapsed")
        searchExpandedSections.add(section)
      }
    }
  })

  // Handle Empty State
  if (emptyState) {
    if (totalMatches === 0) {
      emptyState.style.display = "flex"
      if (emptyText) {
        const template = emptyText.getAttribute("data-msg-template") || 'No settings matching "{query}"'
        emptyText.textContent = template.replace("{query}", query)
      }
    } else {
      emptyState.style.display = "none"
    }
  }
}

/**
 * Exit search mode and restore active tab
 */
function exitSearchMode() {
  const sidebar = document.getElementById("settings-sidebar")
  const sidebarContent = sidebar?.querySelector(".sidebar-content")
  const clearBtn = document.getElementById("settings-search-clear")
  const emptyState = document.getElementById("settings-search-empty")

  if (!sidebar || !sidebarContent) return

  isSearchMode = false
  sidebar.removeAttribute("data-search-mode")

  if (clearBtn) clearBtn.hidden = true
  if (emptyState) emptyState.style.display = "none"

  // Restore collapsed state on sections that were temporarily expanded
  searchExpandedSections.forEach((section) => {
    if (section && section.classList) {
      section.classList.add("collapsed")
    }
  })
  searchExpandedSections.clear()

  // Remove all search hidden classes
  sidebarContent.querySelectorAll(".settings-search-hidden").forEach((el) => {
    el.classList.remove("settings-search-hidden")
  })

  // Restore active tab visibility
  switchSettingsTab(activeTab)
}

/**
 * Initialize Sidebar Navigation and Live Search
 */
export function initSidebarNavigation() {
  const sidebar = document.getElementById("settings-sidebar")
  if (!sidebar) return

  const searchInput = document.getElementById("settings-search-input")
  const clearBtn = document.getElementById("settings-search-clear")
  const emptyResetBtn = document.getElementById("settings-search-empty-reset")
  const tabButtons = sidebar.querySelectorAll(".settings-tab-btn")

  // Load saved tab
  try {
    const savedTab = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB)
    if (savedTab && ["appearance", "background", "clock", "bookmarks", "widgets", "system"].includes(savedTab)) {
      activeTab = savedTab
    }
  } catch (e) {
    activeTab = DEFAULT_TAB
  }

  // Setup Tab Button Clicks
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab")
      if (tabId) {
        switchSettingsTab(tabId)
      }
    })
  })

  // Setup Delegated Background & Appearance Sub-Tab Clicks
  sidebar.addEventListener("click", (e) => {
    const bgSubTabBtn = e.target.closest(".bg-subtab-btn")
    if (bgSubTabBtn) {
      const subTabId = bgSubTabBtn.getAttribute("data-bg-subtab")
      if (subTabId) {
        switchBgSubTab(subTabId)
      }
    }
  })

  // Re-sync background subtabs once partials finish hydrating
  window.addEventListener("startpage:settingsPartialsReady", () => {
    if (activeTab === "background") {
      switchBgSubTab(activeBgSubTab)
    }
  })

  // Setup Live Search Input
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout)
      const query = e.target.value
      searchTimeout = setTimeout(() => {
        handleSettingsSearch(query)
      }, 100)
    })

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = ""
        exitSearchMode()
        searchInput.blur()
      }
    })
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = ""
        searchInput.focus()
      }
      exitSearchMode()
    })
  }

  if (emptyResetBtn) {
    emptyResetBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = ""
      }
      exitSearchMode()
    })
  }

  // Global Keyboard Shortcuts when Sidebar is Open
  document.addEventListener("keydown", (e) => {
    if (!sidebar.classList.contains("open")) return

    // Ctrl+F or Cmd+F inside settings sidebar focuses search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      const isTargetInsideSidebar = sidebar.contains(document.activeElement)
      if (isTargetInsideSidebar || document.activeElement === document.body) {
        e.preventDefault()
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }
    }
  })

  // Re-sync visibility and live badges when sidebar opens or partials hydrate
  const sidebarContent = sidebar.querySelector(".sidebar-content")
  const navContainer = sidebar.querySelector(".settings-nav-container")
  const sidebarHeader = sidebar.querySelector(".sidebar-header")
  let isManuallyHidden = false
  let isUpdatingBadges = false

  if (sidebarContent) {
    let debounceTimer = null
    const observer = new MutationObserver((mutations) => {
      if (isUpdatingBadges) return
      // Only care about newly added section/group elements, not badge text mutations
      const hasStructuralChange = mutations.some(
        (m) =>
          m.type === "childList" &&
          Array.from(m.addedNodes).some(
            (node) =>
              node.nodeType === 1 &&
              !node.classList?.contains("section-live-badge"),
          ),
      )
      if (!hasStructuralChange) return

      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!isSearchMode) {
          switchSettingsTab(activeTab)
        }
        isUpdatingBadges = true
        try {
          updateSectionLiveBadges()
        } finally {
          isUpdatingBadges = false
        }
      }, 150)
    })
    observer.observe(sidebarContent, { childList: true })
  }

  if (sidebarContent && navContainer) {
    let scrollIdleTimer = null
    let scrollRafId = null

    const handleScroll = () => {
      scrollRafId = null
      // If user manually hid the navigation, do not auto-reveal
      if (isManuallyHidden) return

      // If at the very top or search input is focused, stay visible
      if (
        sidebarContent.scrollTop <= 15 ||
        (searchInput && searchInput === document.activeElement)
      ) {
        if (navContainer.classList.contains("nav-hidden")) {
          navContainer.classList.remove("nav-hidden")
        }
        clearTimeout(scrollIdleTimer)
        return
      }

      // Hide immediately when scrolling starts (only if not already hidden)
      if (!navContainer.classList.contains("nav-hidden")) {
        navContainer.classList.add("nav-hidden")
      }

      // 0.5s after user stops scrolling (idle), slide back down smoothly
      clearTimeout(scrollIdleTimer)
      scrollIdleTimer = setTimeout(() => {
        if (!isManuallyHidden) {
          navContainer.classList.remove("nav-hidden")
        }
      }, 500)
    }

    sidebarContent.addEventListener(
      "scroll",
      () => {
        if (!scrollRafId) {
          scrollRafId = requestAnimationFrame(handleScroll)
        }
      },
      { passive: true },
    )

    // Hovering over the header or top area reveals the nav immediately (if not manually hidden)
    if (sidebarHeader) {
      sidebarHeader.addEventListener("mouseenter", () => {
        if (!isManuallyHidden) {
          navContainer.classList.remove("nav-hidden")
          clearTimeout(scrollIdleTimer)
        }
      })
    }
  }

  // Setup Manual Toggle Button (Chevron Icon)
  const navToggleBtn = document.getElementById("settings-nav-toggle")
  if (navToggleBtn && navContainer) {
    navToggleBtn.addEventListener("click", () => {
      const isCurrentlyHidden = navContainer.classList.contains("nav-hidden")
      if (isCurrentlyHidden) {
        // User manually opens it
        isManuallyHidden = false
        navContainer.classList.remove("nav-hidden")
        sidebar?.classList.remove("nav-collapsed")
      } else {
        // User manually hides it
        isManuallyHidden = true
        navContainer.classList.add("nav-hidden")
        sidebar?.classList.add("nav-collapsed")
      }
    })
  }

  if (searchInput && navContainer) {
    searchInput.addEventListener("focus", () => {
      isManuallyHidden = false
      navContainer.classList.remove("nav-hidden")
      sidebar?.classList.remove("nav-collapsed")
    })
  }

  // Initial tab activation
  switchSettingsTab(activeTab)

  // Initial live badge update (with guarded updates)
  setTimeout(() => {
    isUpdatingBadges = true
    try {
      updateSectionLiveBadges()
    } finally {
      isUpdatingBadges = false
    }
  }, 200)

  // Re-update badges on user interactions inside settings (debounced)
  let userActionBadgeTimer = null
  const scheduleBadgeUpdate = () => {
    clearTimeout(userActionBadgeTimer)
    userActionBadgeTimer = setTimeout(() => {
      isUpdatingBadges = true
      try {
        updateSectionLiveBadges()
      } finally {
        isUpdatingBadges = false
      }
    }, 80)
  }

  sidebar.addEventListener("click", scheduleBadgeUpdate)
  sidebar.addEventListener("change", scheduleBadgeUpdate)
}

/**
 * Updates live badges on section headers with current active configuration summary
 */
export function updateSectionLiveBadges() {
  const sections = document.querySelectorAll(".settings-section[data-section-id]")
  sections.forEach((section) => {
    const sectionId = section.getAttribute("data-section-id")
    const toggle = section.querySelector(".section-toggle")
    if (!toggle) return

    let badge = toggle.querySelector(".section-live-badge")
    if (!badge) {
      badge = document.createElement("span")
      badge.className = "section-live-badge"
      badge.setAttribute("data-section-badge", sectionId)
      toggle.appendChild(badge)
    }

    let text = ""
    switch (sectionId) {
      case "themes": {
        const activePreset = section.querySelector(".style-preset-btn.active .style-preset-name")
        const activeTheme = section.querySelector(".theme-item.active .theme-name")
        if (activePreset) {
          text = activePreset.textContent.trim()
        } else if (activeTheme) {
          text = activeTheme.textContent.trim()
        } else {
          const raw = localStorage.getItem("theme") || "Default"
          text = raw.charAt(0).toUpperCase() + raw.slice(1)
        }
        break
      }
      case "font": {
        const fontSelect = document.getElementById("font-family-select")
        if (fontSelect && fontSelect.selectedOptions && fontSelect.selectedOptions[0]) {
          text = fontSelect.selectedOptions[0].textContent.trim()
        } else {
          text = localStorage.getItem("currentFont") || "Inter"
        }
        break
      }
      case "date-clock": {
        const activeClock = section.querySelector(".clock-style-card.active .clock-style-name")
        if (activeClock) {
          text = activeClock.textContent.trim()
        } else {
          const style = localStorage.getItem("clockStyle") || "default"
          text = style.charAt(0).toUpperCase() + style.slice(1)
        }
        break
      }
      case "background":
      case "gradient-multi-color":
      case "animated-backgrounds": {
        const activeBgTab = document.querySelector("#background-tab-buttons .tab-btn.active")
        if (activeBgTab) {
          text = activeBgTab.textContent.trim()
        } else {
          text = "Gradient"
        }
        break
      }
      case "bookmark-custom": {
        const activeLayout = document.querySelector("#bookmark-layout-select")
        if (activeLayout && activeLayout.selectedOptions && activeLayout.selectedOptions[0]) {
          text = activeLayout.selectedOptions[0].textContent.trim()
        } else {
          text = "Grid"
        }
        break
      }
      case "custom-title": {
        const input = document.getElementById("custom-title-input")
        text = (input && input.value) ? input.value.trim() : (localStorage.getItem("customTitle") || "Startpage")
        if (text.length > 12) text = text.substring(0, 10) + "…"
        break
      }
      case "data-sync": {
        text = localStorage.getItem("cloudSyncEnabled") === "true" ? "Cloud" : "Local"
        break
      }
      case "about-project": {
        const versionEl = document.getElementById("settings-version")
        text = (versionEl && versionEl.textContent) ? versionEl.textContent.trim() : "v2.5"
        break
      }
      default: {
        text = ""
        break
      }
    }

    if (text) {
      if (badge.textContent !== text) {
        badge.textContent = text
      }
      if (badge.title !== `Current: ${text}`) {
        badge.title = `Current: ${text}`
      }
    } else {
      if (badge.textContent !== "") {
        badge.textContent = ""
        badge.removeAttribute("title")
      }
    }
  })
}
