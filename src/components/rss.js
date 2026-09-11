import { fadeToggle } from "../utils/dom.js"
import { getSettings, updateSetting, saveSettings } from "../services/state.js"
import { applyTranslations, geti18n } from "../services/i18n.js"

export const RSS_PRESET_PACKS = {
  global: {
    id: "global",
    nameKey: "rss_preset_intl",
    defaultName: "International",
    icon: "fa-solid fa-globe",
    feeds: [
      { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
      { name: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
      { name: "NY Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
      { name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
      { name: "Reuters", url: "https://www.reutersagency.com/feed/?best-topics=world&post_type=best" },
    ],
  },
  tech: {
    id: "tech",
    nameKey: "rss_preset_tech",
    defaultName: "Technology",
    icon: "fa-solid fa-microchip",
    feeds: [
      { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
      { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
      { name: "Wired", url: "https://www.wired.com/feed/rss" },
      { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
      { name: "Hacker News", url: "https://news.ycombinator.com/rss" },
    ],
  },
  vi: {
    id: "vi",
    nameKey: "rss_preset_vn",
    defaultName: "Việt Nam",
    icon: "fa-solid fa-star",
    feeds: [
      { name: "VNE Mới nhất", url: "https://vnexpress.net/rss/tin-moi-nhat.rss" },
      { name: "VNE Thời sự", url: "https://vnexpress.net/rss/thoi-su.rss" },
      { name: "VNE Số hóa", url: "https://vnexpress.net/rss/so-hoa.rss" },
      { name: "VNE Kinh doanh", url: "https://vnexpress.net/rss/kinh-doanh.rss" },
      { name: "Tuổi Trẻ", url: "https://tuoitre.vn/rss/tin-moi-nhat.rss" },
      { name: "Thanh Niên", url: "https://thanhnien.vn/rss/home.rss" },
      { name: "Dân Trí", url: "https://dantri.com.vn/rss/home.rss" },
    ],
  },
  de: {
    id: "de",
    nameKey: "rss_preset_de",
    defaultName: "Deutschland",
    icon: "fa-solid fa-landmark",
    feeds: [
      { name: "Tagesschau", url: "https://www.tagesschau.de/xml/rss2/" },
      { name: "Der Spiegel", url: "https://www.spiegel.de/schlagzeilen/tops/index.rss" },
      { name: "Die Zeit", url: "https://newsfeed.zeit.de/index" },
      { name: "Heise Online", url: "https://www.heise.de/rss/heise-atom.xml" },
    ],
  },
  sv: {
    id: "sv",
    nameKey: "rss_preset_sv",
    defaultName: "Sverige",
    icon: "fa-solid fa-crown",
    feeds: [
      { name: "SVT Nyheter", url: "https://www.svt.se/nyheter/rss.xml" },
      { name: "Dagens Nyheter", url: "https://www.dn.se/rss/" },
      { name: "Aftonbladet", url: "https://rss.aftonbladet.se/rss2/small/pages/sections/senastenytt/" },
      { name: "SweClockers", url: "https://www.sweclockers.com/feeds/nyheter" },
    ],
  },
}

export function getDefaultFeeds(lang = "en") {
  const code = (lang || "").toLowerCase()
  if (code.startsWith("vi")) {
    return RSS_PRESET_PACKS.vi.feeds.slice(0, 4)
  }
  if (code.startsWith("de")) {
    return [
      ...RSS_PRESET_PACKS.de.feeds.slice(0, 3),
      RSS_PRESET_PACKS.tech.feeds[0],
    ]
  }
  if (code.startsWith("sv")) {
    return [
      ...RSS_PRESET_PACKS.sv.feeds.slice(0, 3),
      RSS_PRESET_PACKS.global.feeds[0],
    ]
  }
  return [
    ...RSS_PRESET_PACKS.global.feeds.slice(0, 3),
    ...RSS_PRESET_PACKS.tech.feeds.slice(0, 2),
  ]
}

function escapeHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  const now = Date.now()
  const diffSec = Math.floor((now - d.getTime()) / 1000)
  const i18n = geti18n()

  if (diffSec < 60) {
    return i18n.rss_time_just_now || "Just now"
  }
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    const tmpl = i18n.rss_time_mins_ago || "{m}m ago"
    return tmpl.replace("{m}", diffMin)
  }
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) {
    const tmpl = i18n.rss_time_hours_ago || "{h}h ago"
    return tmpl.replace("{h}", diffHour)
  }
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) {
    const tmpl = i18n.rss_time_days_ago || "{d}d ago"
    return tmpl.replace("{d}", diffDay)
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

export class RssReader {
  constructor(container) {
    this.container = container
    this.activeTabIndex = 0
    this.isReadLaterMode = false

    const currentLang = (getSettings().language || "en").toLowerCase()
    this.activePresetId = currentLang.startsWith("vi")
      ? "vi"
      : currentLang.startsWith("de")
      ? "de"
      : currentLang.startsWith("sv")
      ? "sv"
      : "global"

    this.config = {
      feeds: getDefaultFeeds(currentLang),
      blockedWords: "scandal, drama",
      highlightedWords: "AI, Tech, Startpage",
      showImages: true,
      userCustomized: false,
    }
    this.itemsLimit = 10
    this.currentItems = []
    this.currentSourceTitle = ""

    this.loadConfig()
    this.render()
    this.fetchRSS()

    window.addEventListener("layoutUpdated", (e) => {
      if (e.detail && e.detail.key === "showRss") {
        fadeToggle(this.container, e.detail.value, "flex")
      }
      if (
        e.detail &&
        (e.detail.key === "rssSkin" ||
          e.detail.key === "rssHideBorder" ||
          e.detail.key === "rssMini" ||
          e.detail.key === "rssExpanded" ||
          e.detail.key === "widgetUseM3Accent")
      ) {
        this.applyAppearance()
      }
    })

    window.addEventListener("languageChanged", () => {
      const lang = (getSettings().language || "en").toLowerCase()
      if (!this.config.userCustomized) {
        this.config.feeds = getDefaultFeeds(lang)
        this.saveConfig()
        this.activeTabIndex = 0
        this.renderTabs()
        this.fetchRSS(true)
      } else {
        this.renderTabs()
        this.renderItems()
      }
      this.updatePresetTabsUI()
      this.updatePresetChipsUI()
      applyTranslations(this.container)
    })

    this.applyAppearance()
    fadeToggle(this.container, getSettings().showRss === true, "flex")
  }

  applyAppearance() {
    const settings = getSettings()

    // Skin
    const skin = settings.rssSkin || "default"
    this.container.classList.toggle("skin-white-blur", skin === "white-blur")
    this.container.classList.toggle("skin-m3-accent", skin === "m3-accent")
    this.container.classList.toggle("skin-transparent", skin === "transparent")
    this.container.classList.toggle(
      "skin-light-transparent",
      skin === "light-transparent",
    )

    // Border
    const hideBorder = settings.rssHideBorder === true
    this.container.classList.toggle("widget-border-hidden", hideBorder)

    // Expand / Mini
    const isMini = settings.rssMini === true
    const isExpanded = settings.rssExpanded === true && !isMini
    this.container.classList.toggle("rss-mini", isMini)
    this.container.classList.toggle("rss-expanded", isExpanded)

    const expandBtnIcon = this.container.querySelector(".rss-expand-btn i")
    if (expandBtnIcon) {
      expandBtnIcon.className = isExpanded
        ? "fa-solid fa-down-left-and-up-right-to-center"
        : "fa-solid fa-up-right-and-down-left-from-center"
    }

    if (isMini || isExpanded) {
      this.container.style.width = ""
      this.container.style.height = ""
    } else {
      const savedW = localStorage.getItem("rssWidgetCustomWidth")
      const savedH = localStorage.getItem("rssWidgetCustomHeight")
      if (savedW && savedH) {
        this.container.style.width = `${savedW}px`
        this.container.style.height = `${savedH}px`
      }
    }
  }

  loadConfig() {
    const currentLang = (getSettings().language || "en").toLowerCase()
    const saved = localStorage.getItem("rssWidgetConfig")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.url && !parsed.feeds) {
          parsed.feeds = [{ name: "Trang chủ", url: parsed.url }]
          delete parsed.url
        }
        if (parsed.showImages === undefined) parsed.showImages = true

        // Detect legacy default that hardcoded 21 VnExpress feeds for non-Vietnamese users
        const isLegacyVnDefault =
          Array.isArray(parsed.feeds) &&
          parsed.feeds.length > 5 &&
          parsed.feeds.every((f) => f.url && f.url.includes("vnexpress.net")) &&
          !parsed.userCustomized

        if (isLegacyVnDefault && !currentLang.startsWith("vi")) {
          parsed.feeds = getDefaultFeeds(currentLang)
        }

        this.config = { ...this.config, ...parsed }
      } catch (e) {}
    } else {
      this.config.feeds = getDefaultFeeds(currentLang)
      this.saveConfig()
    }
  }

  saveConfig() {
    localStorage.setItem("rssWidgetConfig", JSON.stringify(this.config))
  }

  render() {
    this.container.innerHTML = `
      <div class="rss-header">
        <div class="rss-header-left">
          <i class="fa-solid fa-rss" style="color: var(--accent-color, #4a80f0);"></i>
          <span>RSS News</span>
        </div>
        <div class="rss-actions">
          <button class="rss-expand-btn" data-i18n-title="widget_expand_size" title="Phóng to"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>
          <button class="rss-refresh-btn" data-i18n-title="rss_refresh_btn" title="Refresh"><i class="fa-solid fa-rotate-right"></i></button>
          <button class="rss-settings-btn" data-i18n-title="rss_settings_btn" title="Settings"><i class="fa-solid fa-gear"></i></button>
          <button class="rss-close-btn widget-close-btn" title="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="rss-tabs" style="display: none;"></div>

      <div class="rss-settings">
        <div class="rss-settings-group">
          <label data-i18n="rss_presets_toggle" style="font-weight: 600; opacity: 0.9;">Gợi ý nguồn RSS (Presets)</label>
          <div class="rss-preset-tabs"></div>
          <div class="rss-preset-actions">
            <button type="button" class="rss-preset-action-btn apply-btn">
              <i class="fa-solid fa-check"></i> <span data-i18n="rss_apply_preset">Áp dụng bộ này</span>
            </button>
            <button type="button" class="rss-preset-action-btn reset-btn">
              <i class="fa-solid fa-rotate-left"></i> <span data-i18n="rss_reset_default">Khôi phục mặc định</span>
            </button>
          </div>
          <div class="rss-preset-chips"></div>
        </div>

        <div class="rss-settings-group">
          <label data-i18n="rss_settings_title">Danh sách Nguồn RSS (Tên Tab | Link - Mỗi dòng 1 nguồn)</label>
          <textarea class="rss-input" id="rss-feeds" rows="4" style="resize: vertical; white-space: pre;" placeholder="BBC World | https://feeds.bbci.co.uk/news/world/rss.xml&#10;The Verge | https://www.theverge.com/rss/index.xml"></textarea>
          <div style="margin-top: 5px; display: flex; gap: 5px; flex-wrap: wrap;">
            <a href="https://vnexpress.net/rss" target="_blank" class="rss-source-link"><i class="fa-solid fa-link" style="margin-right:2px;"></i> <span data-i18n="rss_copy_vne">Lấy RSS VNExpress</span></a>
            <a href="https://tuoitre.vn/rss.htm" target="_blank" class="rss-source-link"><i class="fa-solid fa-link" style="margin-right:2px;"></i> <span data-i18n="rss_copy_tt">Lấy RSS Tuổi Trẻ</span></a>
          </div>
        </div>

        <div class="rss-settings-group">
          <label data-i18n="rss_blocked_words">Từ khóa bị chặn (ngăn cách bởi dấu phẩy)</label>
          <input type="text" class="rss-input" id="rss-block" value="${escapeHtml(this.config.blockedWords)}" placeholder="scandal, drama">
        </div>

        <div class="rss-settings-group">
          <label data-i18n="rss_highlighted_words">Từ khóa nổi bật (ngăn cách bởi dấu phẩy)</label>
          <input type="text" class="rss-input" id="rss-highlight" value="${escapeHtml(this.config.highlightedWords)}" placeholder="AI, Technology">
        </div>

        <div class="rss-settings-group" style="flex-direction: row; align-items: center; gap: 8px;">
          <input type="checkbox" id="rss-show-images" ${this.config.showImages ? "checked" : ""} style="cursor: pointer;">
          <label for="rss-show-images" data-i18n="rss_show_images" style="cursor: pointer; opacity: 1; margin: 0;">Hiển thị ảnh đại diện báo</label>
        </div>

        <button class="rss-save-btn" data-i18n="rss_save_btn">Lưu & Tải lại</button>
      </div>

      <div class="rss-content">
        <div style="text-align:center; padding:20px; opacity:0.7;">Loading feeds...</div>
      </div>
      <button class="rss-scroll-top-btn" title="Lên đầu trang"><i class="fa-solid fa-arrow-up"></i></button>
    `

    applyTranslations(this.container)

    this.contentEl = this.container.querySelector(".rss-content")
    this.settingsEl = this.container.querySelector(".rss-settings")
    this.scrollTopBtn = this.container.querySelector(".rss-scroll-top-btn")

    if (this.scrollTopBtn && this.contentEl) {
      this.contentEl.addEventListener("scroll", () => {
        if (this.contentEl.scrollTop > 150) {
          this.scrollTopBtn.classList.add("visible")
        } else {
          this.scrollTopBtn.classList.remove("visible")
        }
      })
      this.scrollTopBtn.addEventListener("click", () => {
        this.contentEl.scrollTo({ top: 0, behavior: "smooth" })
      })
    }

    this.container
      .querySelector(".rss-refresh-btn")
      ?.addEventListener("click", () => this.fetchRSS(true))

    this.container
      .querySelector(".rss-close-btn")
      ?.addEventListener("click", () => {
        updateSetting("showRss", false)
        saveSettings()
        fadeToggle(this.container, false, "flex")
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "showRss", value: false },
          }),
        )
      })

    this.container
      .querySelector(".rss-settings-btn")
      ?.addEventListener("click", () => {
        this.settingsEl.classList.toggle("active")
        const isActive = this.settingsEl.classList.contains("active")
        this.contentEl.style.display = isActive ? "none" : "flex"

        const tabsEl = this.container.querySelector(".rss-tabs")
        if (tabsEl) {
          if (isActive) {
            tabsEl.style.display = "none"
            this.syncSettingsFields()
          } else {
            this.renderTabs()
          }
        }
      })

    this.container
      .querySelector(".rss-expand-btn")
      ?.addEventListener("click", () => {
        const settings = getSettings()
        const isExp = !(settings.rssExpanded === true && !settings.rssMini)
        updateSetting("rssExpanded", isExp)
        if (isExp) updateSetting("rssMini", false)
        saveSettings(true)
        this.applyAppearance()
        window.dispatchEvent(
          new CustomEvent("layoutUpdated", {
            detail: { key: "rssExpanded", value: isExp },
          }),
        )
      })

    if (window.ResizeObserver && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (
            this.container.classList.contains("rss-mini") ||
            this.container.classList.contains("rss-expanded")
          ) {
            return
          }
          const { width, height } = entry.contentRect
          if (width > 300 && height > 300) {
            clearTimeout(this._saveSizeTimer)
            this._saveSizeTimer = setTimeout(() => {
              localStorage.setItem(
                "rssWidgetCustomWidth",
                Math.round(this.container.offsetWidth),
              )
              localStorage.setItem(
                "rssWidgetCustomHeight",
                Math.round(this.container.offsetHeight),
              )
            }, 400)
          }
        }
      })
      this.resizeObserver.observe(this.container)
    }

    this.setupSettingsEvents()
    this.renderTabs()
  }

  syncSettingsFields() {
    const feedsTextarea = this.container.querySelector("#rss-feeds")
    if (feedsTextarea) {
      feedsTextarea.value = this.config.feeds
        .map((f) => `${f.name} | ${f.url}`)
        .join("\n")
    }
    this.updatePresetTabsUI()
    this.updatePresetChipsUI()
  }

  updatePresetTabsUI() {
    const presetTabsContainer = this.container.querySelector(".rss-preset-tabs")
    if (!presetTabsContainer) return
    const i18n = geti18n()

    presetTabsContainer.innerHTML = Object.values(RSS_PRESET_PACKS)
      .map(
        (pack) => `
        <button type="button" class="rss-preset-tab-btn ${this.activePresetId === pack.id ? "active" : ""}" data-pack-id="${pack.id}">
          <i class="${pack.icon}"></i> ${i18n[pack.nameKey] || pack.defaultName}
        </button>
      `,
      )
      .join("")

    presetTabsContainer.querySelectorAll(".rss-preset-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const packId = e.currentTarget.dataset.packId
        this.activePresetId = packId
        this.updatePresetTabsUI()
        this.updatePresetChipsUI()
      })
    })
  }

  updatePresetChipsUI() {
    const chipsContainer = this.container.querySelector(".rss-preset-chips")
    const feedsTextarea = this.container.querySelector("#rss-feeds")
    if (!chipsContainer || !feedsTextarea) return

    const pack = RSS_PRESET_PACKS[this.activePresetId] || RSS_PRESET_PACKS.global
    const currentLines = feedsTextarea.value
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l)

    chipsContainer.innerHTML = pack.feeds
      .map((feed) => {
        const isActive = currentLines.some((l) => l.includes(feed.url))
        return `
          <button type="button" class="rss-preset-chip ${isActive ? "active" : ""}" data-name="${escapeHtml(feed.name)}" data-url="${escapeHtml(feed.url)}">
            <i class="fa-solid ${isActive ? "fa-check" : "fa-plus"}"></i> ${escapeHtml(feed.name)}
          </button>
        `
      })
      .join("")

    chipsContainer.querySelectorAll(".rss-preset-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const btn = e.currentTarget
        const name = btn.dataset.name
        const url = btn.dataset.url
        let lines = feedsTextarea.value
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l)

        const existingIdx = lines.findIndex((l) => l.includes(url))
        if (existingIdx !== -1) {
          lines.splice(existingIdx, 1)
        } else {
          if (lines.length >= 10) {
            alert("Bạn chỉ được chọn tối đa 10 nguồn để đảm bảo trải nghiệm tốt nhất!")
            return
          }
          lines.push(`${name} | ${url}`)
        }
        feedsTextarea.value = lines.join("\n")
        this.updatePresetChipsUI()
      })
    })
  }

  setupSettingsEvents() {
    const feedsTextarea = this.container.querySelector("#rss-feeds")
    if (feedsTextarea) {
      feedsTextarea.addEventListener("input", () => {
        this.updatePresetChipsUI()
      })
    }

    // Apply Preset button
    const applyBtn = this.container.querySelector(".rss-preset-action-btn.apply-btn")
    applyBtn?.addEventListener("click", () => {
      const pack = RSS_PRESET_PACKS[this.activePresetId] || RSS_PRESET_PACKS.global
      if (feedsTextarea && pack) {
        feedsTextarea.value = pack.feeds.map((f) => `${f.name} | ${f.url}`).join("\n")
        this.updatePresetChipsUI()
      }
    })

    // Reset Defaults button
    const resetBtn = this.container.querySelector(".rss-preset-action-btn.reset-btn")
    resetBtn?.addEventListener("click", () => {
      const currentLang = (getSettings().language || "en").toLowerCase()
      const defaultFeeds = getDefaultFeeds(currentLang)
      if (feedsTextarea) {
        feedsTextarea.value = defaultFeeds.map((f) => `${f.name} | ${f.url}`).join("\n")
        this.activePresetId = currentLang.startsWith("vi")
          ? "vi"
          : currentLang.startsWith("de")
          ? "de"
          : currentLang.startsWith("sv")
          ? "sv"
          : "global"
        this.updatePresetTabsUI()
        this.updatePresetChipsUI()
      }
    })

    // Save button
    this.container
      .querySelector(".rss-save-btn")
      ?.addEventListener("click", () => {
        const lines = (feedsTextarea ? feedsTextarea.value : "")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l)

        const parsedFeeds = lines
          .map((line) => {
            const parts = line.split("|")
            return {
              name: parts[0]?.trim() || "Feed",
              url: parts[1]?.trim() || "",
            }
          })
          .filter((f) => f.url)

        const currentLang = (getSettings().language || "en").toLowerCase()
        this.config.feeds = parsedFeeds.length > 0 ? parsedFeeds : getDefaultFeeds(currentLang)
        this.config.userCustomized = true
        this.config.blockedWords = this.container.querySelector("#rss-block")?.value || ""
        this.config.highlightedWords = this.container.querySelector("#rss-highlight")?.value || ""
        this.config.showImages = this.container.querySelector("#rss-show-images")?.checked ?? true

        this.saveConfig()

        this.settingsEl.classList.remove("active")
        this.contentEl.style.display = "flex"
        this.activeTabIndex = 0
        this.renderTabs()
        this.fetchRSS(true)
      })
  }

  renderTabs() {
    const tabsEl = this.container.querySelector(".rss-tabs")
    if (!tabsEl) return

    tabsEl.style.display = "flex"
    let tabsHtml = this.config.feeds
      .map(
        (feed, idx) => `
            <div class="rss-tab ${!this.isReadLaterMode && idx === this.activeTabIndex ? "active" : ""}" data-index="${idx}">
                ${escapeHtml(feed.name)}
            </div>
        `,
      )
      .join("")

    let savedCount = 0
    try {
      const savedArticles = JSON.parse(localStorage.getItem("rssReadLater") || "[]")
      savedCount = savedArticles.length
    } catch (e) {}

    tabsHtml += `
            <div class="rss-tab ${this.isReadLaterMode ? "active" : ""}" data-read-later="true" style="margin-left: auto;">
                <i class="fa-solid fa-bookmark"></i> <span data-i18n="rss_read_later">Đọc sau</span>${savedCount > 0 ? ` <span class="rss-badge">${savedCount}</span>` : ""}
            </div>
        `
    tabsEl.innerHTML = tabsHtml
    applyTranslations(tabsEl)

    tabsEl.querySelectorAll(".rss-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const target = e.currentTarget
        if (target.dataset.readLater) {
          this.isReadLaterMode = true
        } else {
          this.isReadLaterMode = false
          this.activeTabIndex = parseInt(target.dataset.index)
        }
        this.renderTabs()
        this.fetchRSS(false)
      })
    })

    if (!tabsEl.dataset.wheelBound) {
      tabsEl.dataset.wheelBound = "true"
      tabsEl.addEventListener(
        "wheel",
        (e) => {
          if (e.deltaY !== 0) {
            e.preventDefault()
            tabsEl.scrollLeft += e.deltaY * 0.9
          }
        },
        { passive: false },
      )
    }
  }

  async fetchRSSData(url) {
    const fetchRss2Json = async () => {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.status === "ok") {
        return { feed: { title: data.feed.title }, items: data.items }
      }
      throw new Error()
    }

    const fetchRawProxy = async (proxyUrl) => {
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error()
      const text = await res.text()
      if (text && (text.includes("<rss") || text.includes("<feed"))) {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(text, "text/xml")
        const sourceTitle =
          xmlDoc.querySelector("channel > title, feed > title")?.textContent || "RSS Feed"

        const rawNodes =
          xmlDoc.querySelectorAll("item").length > 0
            ? xmlDoc.querySelectorAll("item")
            : xmlDoc.querySelectorAll("entry")

        const items = Array.from(rawNodes).map((item) => {
          let thumbnail = ""
          const mediaContent =
            item.getElementsByTagName("media:content")[0] ||
            item.getElementsByTagName("media:thumbnail")[0]
          const enclosure = item.querySelector("enclosure")

          if (mediaContent && mediaContent.getAttribute("url")) {
            thumbnail = mediaContent.getAttribute("url")
          } else if (
            enclosure &&
            enclosure.getAttribute("type")?.startsWith("image/")
          ) {
            thumbnail = enclosure.getAttribute("url")
          } else {
            const content =
              item.getElementsByTagName("content:encoded")[0]?.textContent ||
              item.querySelector("content")?.textContent ||
              item.querySelector("description")?.textContent ||
              item.querySelector("summary")?.textContent ||
              ""
            const imgMatch = content.match(/<img[^>]+src=["']([^"'>]+)["']/i)
            if (imgMatch) thumbnail = imgMatch[1]
          }

          let link =
            item.querySelector("link[rel='alternate']")?.getAttribute("href") ||
            item.querySelector("link")?.getAttribute("href") ||
            item.querySelector("link")?.textContent ||
            ""

          let desc =
            item.querySelector("description")?.textContent ||
            item.querySelector("summary")?.textContent ||
            item.querySelector("content")?.textContent ||
            ""
          desc = desc.replace(/<[^>]*>?/gm, "").trim()
          if (desc.length > 130) desc = desc.substring(0, 130) + "..."

          const pubDate =
            item.querySelector("pubDate")?.textContent ||
            item.querySelector("published")?.textContent ||
            item.querySelector("updated")?.textContent ||
            ""

          return {
            title: item.querySelector("title")?.textContent || "",
            link: link.trim(),
            pubDate: pubDate.trim(),
            thumbnail: thumbnail,
            description: desc,
          }
        })
        return { feed: { title: sourceTitle }, items: items }
      }
      throw new Error()
    }

    return Promise.any([
      fetchRss2Json(),
      fetchRawProxy(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      ),
      fetchRawProxy(
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      ),
      fetchRawProxy(`https://corsproxy.io/?${encodeURIComponent(url)}`),
    ])
  }

  async fetchRSS(forceRefresh = false) {
    const refreshBtn = this.container.querySelector(".rss-refresh-btn")
    refreshBtn?.classList.add("spinning")

    this.contentEl.innerHTML = `<div style="text-align:center; padding:24px; opacity:0.75;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`

    if (this.isReadLaterMode) {
      const saved = localStorage.getItem("rssReadLater")
      this.currentItems = saved ? JSON.parse(saved) : []
      this.currentSourceTitle = geti18n().rss_read_later || "Đọc sau"
      this.itemsLimit = 50
      refreshBtn?.classList.remove("spinning")
      if (this.currentItems.length === 0) {
        this.contentEl.innerHTML = `<div style="text-align:center; padding:24px; opacity:0.75;" data-i18n="rss_empty">Chưa có bài viết nào được lưu.</div>`
        applyTranslations(this.contentEl)
      } else {
        this.renderItems()
      }
      return
    }

    const currentFeed = this.config.feeds[this.activeTabIndex]
    if (!currentFeed || !currentFeed.url) {
      refreshBtn?.classList.remove("spinning")
      this.contentEl.innerHTML = `<div style="text-align:center; padding:24px; opacity:0.75;">No RSS Feed configured.</div>`
      return
    }

    const url = currentFeed.url
    const cacheKey = `rss_cache_${url}`
    const cachedData = localStorage.getItem(cacheKey)
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_time`)

    // Cache duration: 15 minutes
    const isCacheValid =
      !forceRefresh &&
      cachedData &&
      cacheTimestamp &&
      Date.now() - parseInt(cacheTimestamp) < 15 * 60 * 1000

    if (isCacheValid) {
      try {
        const data = JSON.parse(cachedData)
        this.currentItems = data.items
        this.currentSourceTitle = data.feed.title
        this.itemsLimit = 10
        this.renderItems()
        this.fetchRSSBackground(cacheKey, url)
        refreshBtn?.classList.remove("spinning")
        return
      } catch (e) {}
    }

    try {
      const parsedData = await this.fetchRSSData(url)
      localStorage.setItem(cacheKey, JSON.stringify(parsedData))
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString())
      this.currentItems = parsedData.items
      this.currentSourceTitle = parsedData.feed.title
      this.itemsLimit = 10
      this.renderItems()
    } catch (error) {
      console.error("RSS Fetch Error:", error)
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData)
          this.currentItems = data.items
          this.currentSourceTitle = data.feed.title
          this.itemsLimit = 10
          this.renderItems()
          refreshBtn?.classList.remove("spinning")
          return
        } catch (e) {}
      }
      this.contentEl.innerHTML = `
        <div style="text-align:center; padding:24px; color:#ff6b6b; font-size:0.88rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:1.4rem; margin-bottom:8px; display:block;"></i>
          Failed to load RSS feed.
          <div style="margin-top:10px;">
            <button class="rss-retry-btn" style="padding:4px 12px; border-radius:6px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:inherit; cursor:pointer;"><i class="fa-solid fa-rotate-right"></i> Retry</button>
          </div>
        </div>
      `
      this.contentEl.querySelector(".rss-retry-btn")?.addEventListener("click", () => this.fetchRSS(true))
    } finally {
      refreshBtn?.classList.remove("spinning")
    }
  }

  async fetchRSSBackground(cacheKey, url) {
    try {
      const parsedData = await this.fetchRSSData(url)
      localStorage.setItem(cacheKey, JSON.stringify(parsedData))
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString())
    } catch (e) {
      // Background fetch failed, ignore
    }
  }

  renderItems() {
    const items = this.currentItems
    const sourceTitle = this.currentSourceTitle
    const blockWords = (this.config.blockedWords || "")
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w)
    const highlightWords = (this.config.highlightedWords || "")
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w)

    let html = ""
    let count = 0

    const savedArticlesStr = localStorage.getItem("rssReadLater")
    let savedArticles = []
    try {
      if (savedArticlesStr) savedArticles = JSON.parse(savedArticlesStr)
    } catch (e) {}

    for (const item of items) {
      if (count >= this.itemsLimit) break

      const title = item.title || ""
      const lowerTitle = title.toLowerCase()
      const linkStr = item.link || ""

      // Check blocked words
      const isBlocked = blockWords.some((word) => lowerTitle.includes(word))
      if (isBlocked) continue

      // Check highlighted words
      const isHighlight = highlightWords.some((word) =>
        lowerTitle.includes(word),
      )

      // Extract image
      let imageUrl = item.thumbnail || ""
      if (!imageUrl && item.enclosure && item.enclosure.link) {
        imageUrl = item.enclosure.link
      }
      if (!imageUrl && (item.content || item.description)) {
        const text = item.content || item.description || ""
        const match = text.match(/<img[^>]+src=["']([^"'>]+)["']/i)
        if (match) imageUrl = match[1]
      }

      // Format relative time
      const relativeTime = formatRelativeTime(item.pubDate)

      // Ensure description is plain text
      let safeDesc = item.description || ""
      if (safeDesc.includes("<")) {
        safeDesc = safeDesc.replace(/<[^>]*>?/gm, "").trim()
      }
      if (safeDesc.length > 130) safeDesc = safeDesc.substring(0, 130) + "..."

      const isSaved = savedArticles.some((a) => a.link === linkStr)
      const bookmarkIcon = isSaved
        ? "fa-solid fa-bookmark"
        : "fa-regular fa-bookmark"

      html += `
        <div class="rss-item-container">
          <a href="${linkStr}" target="_blank" rel="noopener noreferrer" class="rss-item ${isHighlight ? "highlight" : ""}">
            ${
              this.config.showImages
                ? imageUrl
                  ? `<img class="rss-item-thumb" src="${imageUrl}" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="rss-item-thumb-placeholder" style="display:none;"><i class="fa-solid fa-newspaper"></i></div>`
                  : `<div class="rss-item-thumb-placeholder"><i class="fa-solid fa-newspaper"></i></div>`
                : ""
            }
            <div class="rss-item-body">
              <div class="rss-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              ${safeDesc ? `<div class="rss-item-desc">${escapeHtml(safeDesc)}</div>` : ""}
              <div class="rss-item-meta">
                <div class="rss-item-meta-left">
                  <span class="rss-source-pill"><i class="fa-solid fa-newspaper"></i> ${escapeHtml(sourceTitle)}</span>
                  ${relativeTime ? `<span class="rss-time-pill"><i class="fa-regular fa-clock"></i> ${relativeTime}</span>` : ""}
                </div>
                <button class="rss-bookmark-btn ${isSaved ? "saved" : ""}" data-item="${encodeURIComponent(JSON.stringify(item))}" title="${isSaved ? "Bỏ lưu" : "Lưu đọc sau"}" type="button">
                  <i class="${bookmarkIcon}"></i>
                </button>
              </div>
            </div>
          </a>
        </div>
      `
      count++
    }

    if (count === 0) {
      html = `<div style="text-align:center; padding:24px; opacity:0.75;" data-i18n="rss_empty">Không có tin nào hoặc bị lọc hết.</div>`
    } else if (count >= this.itemsLimit && items.length > this.itemsLimit) {
      html += `<button class="rss-load-more" style="margin-top: 10px; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.22); color: var(--text-color); cursor: pointer; transition: background 0.2s; font-family: inherit; font-size: 0.8rem;">Xem thêm tin cũ hơn...</button>`
    }

    this.contentEl.innerHTML = html
    applyTranslations(this.contentEl)

    const loadMoreBtn = this.contentEl.querySelector(".rss-load-more")
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        this.itemsLimit += 10
        this.renderItems()
      })
    }

    this.bindSaveButtons()
  }

  bindSaveButtons() {
    const btns = this.contentEl.querySelectorAll(".rss-bookmark-btn")
    btns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()

        const itemData = JSON.parse(decodeURIComponent(btn.dataset.item))
        const savedArticlesStr = localStorage.getItem("rssReadLater")
        let savedArticles = []
        try {
          if (savedArticlesStr) savedArticles = JSON.parse(savedArticlesStr)
        } catch (err) {}

        const index = savedArticles.findIndex((a) => a.link === itemData.link)
        if (index > -1) {
          savedArticles.splice(index, 1)
          btn.classList.remove("saved")
          btn.querySelector("i").className = "fa-regular fa-bookmark"
          if (this.isReadLaterMode) {
            const container = btn.closest(".rss-item-container")
            if (container) container.remove()
            this.currentItems = savedArticles
            if (savedArticles.length === 0) {
              this.contentEl.innerHTML = `<div style="text-align:center; padding:24px; opacity:0.75;" data-i18n="rss_empty">Không có tin nào hoặc bị lọc hết.</div>`
              applyTranslations(this.contentEl)
            }
          }
        } else {
          savedArticles.push(itemData)
          btn.classList.add("saved")
          btn.querySelector("i").className = "fa-solid fa-bookmark"
        }
        localStorage.setItem("rssReadLater", JSON.stringify(savedArticles))
        this.renderTabs()
      })
    })
  }

  async translateText(text) {
    if (!text) return ""
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(text)}`,
      )
      const data = await res.json()
      return data[0].map((x) => x[0]).join("")
    } catch (e) {
      return text
    }
  }

  async translateCurrentItems() {
    const itemsToTranslate = this.container.querySelectorAll(
      ".rss-item-title:not(.translated), .rss-item-desc:not(.translated)",
    )

    const promises = Array.from(itemsToTranslate).map(async (el) => {
      const text = el.textContent
      if (text.trim().length > 0) {
        const translated = await this.translateText(text)
        if (translated && translated !== text) {
          el.textContent = translated
        }
        el.classList.add("translated")
      }
    })

    await Promise.all(promises)
  }
}
