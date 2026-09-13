/**
 * Sidebar Table of Contents (ToC) Module
 * Extracted from eventHandlers.js
 */

import { geti18n } from "../../services/i18n.js"
import {
  switchSettingsTab,
  switchBgSubTab,
  scrollToSidebarElement,
} from "./sidebarNavigation.js"

export const initSidebarToC = (DOM, sidebarContent) => {
  const tocToggle = DOM.sidebarTocToggle
  const tocMenu = DOM.sidebarTocMenu
  if (!tocToggle || !tocMenu) return

  const populateToC = () => {
    tocMenu.innerHTML = ""

    const queryStr = [
      ".settings-section",
      "#page-title-input",
      "#language-select",
      "#accent-color-group",
    ].join(", ")

    const elList = Array.from(sidebarContent.querySelectorAll(queryStr)).map(
      (el) => {
        if (el.tagName === "INPUT" || el.tagName === "SELECT") {
          return el.closest(".setting-group")
        }
        return el
      },
    )

    // Remove duplicates
    const sections = [...new Set(elList)].filter(Boolean)
    const addedTitles = new Set()

    const i18n = geti18n()
    const tocHeader = document.createElement("div")
    tocHeader.className = "toc-header"
    tocHeader.innerHTML = `
      <div class="toc-header-title">
        <i class="fa-solid fa-list-ul"></i>
        <span>${i18n.sidebar_toc || "Table of Contents"}</span>
      </div>
      <span class="toc-badge">${sections.length}</span>
    `
    tocMenu.appendChild(tocHeader)

    const tocList = document.createElement("div")
    tocList.className = "toc-items-list"

    sections.forEach((section) => {
      let title = ""
      let iconClass = ""
      let isSubItem = false
      let liveBadgeText = ""

      if (section.classList.contains("settings-section")) {
        // Main Section Title
        const toggle = section.querySelector(".section-toggle")
        if (toggle) {
          const liveBadge = toggle.querySelector(
            ".section-live-badge, .section-count",
          )
          if (liveBadge) {
            liveBadgeText = liveBadge.textContent.trim()
          }
          const titleSpan = toggle.querySelector(
            "span[data-i18n], span:not(.section-live-badge):not(.section-count)",
          )
          if (titleSpan) {
            title = titleSpan.textContent.trim()
          } else {
            const clone = toggle.cloneNode(true)
            clone
              .querySelectorAll(".section-live-badge, .section-count, i")
              .forEach((el) => el.remove())
            title = clone.textContent.trim()
          }
          const icon = toggle.querySelector("i")
          if (icon) iconClass = icon.className
        }
      } else {
        // Sub Items (Effect, Page Title, etc)
        isSubItem = !!section.closest(".settings-section")
        const header = section.querySelector(".group-header")
        const label = section.querySelector(":scope > label")
        const settingLabel = section.querySelector(":scope > .setting-label")

        if (header) {
          const liveBadge = header.querySelector(
            ".section-live-badge, .section-count",
          )
          if (liveBadge) liveBadgeText = liveBadge.textContent.trim()
          const span = header.querySelector(
            "span[data-i18n], span:not(.section-live-badge):not(.section-count)",
          )
          title = span ? span.textContent.trim() : header.textContent.trim()
          const icon = header.querySelector("i.group-icon, i")
          if (icon) iconClass = icon.className
        } else if (label) {
          const span = label.querySelector("span[data-i18n]")
          title = span ? span.textContent.trim() : label.textContent.trim()
          const icon = label.querySelector("i")
          if (icon) iconClass = icon.className
        } else if (settingLabel) {
          const span = settingLabel.querySelector("span[data-i18n]")
          title = span
            ? span.textContent.trim()
            : settingLabel.textContent.trim()
          const icon = settingLabel.querySelector("i")
          if (icon) iconClass = icon.className
        }
      }

      if (title && !addedTitles.has(title)) {
        addedTitles.add(title)

        const targetTab = getElementTab(section)
        const targetBgSubTab =
          targetTab === "background" ? getElementBgSubTab(section) : null

        let tabBadgeLabel = ""
        if (targetTab === "appearance") {
          tabBadgeLabel = i18n.settings_tab_appearance || "Appearance"
        } else if (targetTab === "background") {
          if (targetBgSubTab === "media")
            tabBadgeLabel = i18n.bg_subtab_media || "Media"
          else if (targetBgSubTab === "colors")
            tabBadgeLabel = i18n.bg_subtab_colors || "Colors"
          else if (targetBgSubTab === "animated")
            tabBadgeLabel = i18n.bg_subtab_animated || "Live FX"
          else if (targetBgSubTab === "adjust")
            tabBadgeLabel = i18n.bg_subtab_adjust || "Adjust"
          else tabBadgeLabel = i18n.settings_tab_background || "Background"
        } else if (targetTab === "widgets") {
          tabBadgeLabel = i18n.settings_tab_widgets || "Widgets"
        } else if (targetTab === "system") {
          tabBadgeLabel = i18n.settings_tab_system || "System"
        }

        const liveBadgeHtml = liveBadgeText
          ? `<span class="toc-live-badge">${liveBadgeText}</span>`
          : ""
        const badgeHtml = tabBadgeLabel
          ? `<span class="toc-item-badge tab-${targetTab || "default"}">${tabBadgeLabel}</span>`
          : ""

        const item = document.createElement("div")
        item.className = "toc-item"
        if (isSubItem) {
          item.classList.add("sub-item")
        }
        const isAboutProject =
          section.dataset.sectionId === "about-project" ||
          section.getAttribute("data-section-id") === "about-project" ||
          section.id === "about-project"
        if (isAboutProject) {
          item.classList.add("toc-highlight-glow")
          item.innerHTML = `
            <div class="toc-glow-mask">
              <div class="toc-glow-rotator"></div>
            </div>
            <i class="${iconClass || "fa-solid fa-circle-info"}"></i>
            <span class="toc-item-title">${title}</span>
            ${liveBadgeHtml}
            ${badgeHtml}
          `
        } else {
          item.innerHTML = `
            <i class="${iconClass || "fa-solid fa-chevron-right"}"></i>
            <span class="toc-item-title">${title}</span>
            ${liveBadgeHtml}
            ${badgeHtml}
          `
        }
        item.addEventListener("click", () => {
          // Close ToC popup immediately
          tocMenu.classList.remove("open")
          tocToggle.classList.remove("active")

          if (typeof scrollToSidebarElement === "function") {
            scrollToSidebarElement(section, true)
          } else {
            if (targetTab) switchSettingsTab(targetTab)
            if (
              targetTab === "background" &&
              targetBgSubTab &&
              typeof switchBgSubTab === "function"
            ) {
              switchBgSubTab(targetBgSubTab)
            }
          }
        })
        tocList.appendChild(item)
      }
    })
    tocMenu.appendChild(tocList)
  }

  tocToggle.addEventListener("click", (e) => {
    e.stopPropagation()
    const isOpen = tocMenu.classList.toggle("open")
    tocToggle.classList.toggle("active", isOpen)
    if (isOpen) populateToC()
  })

  document.addEventListener("click", (e) => {
    if (!tocMenu.contains(e.target) && !tocToggle.contains(e.target)) {
      tocMenu.classList.remove("open")
      tocToggle.classList.remove("active")
    }
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && tocMenu.classList.contains("open")) {
      tocMenu.classList.remove("open")
      tocToggle.classList.remove("active")
    }
  })
}

