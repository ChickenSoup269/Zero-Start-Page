import { fadeToggle } from "../utils/dom.js"
import { getSettings } from "../services/state.js"

export class RssReader {
    constructor(container) {
        this.container = container;
        this.feeds = [];
        this.config = {
            url: "https://vnexpress.net/rss/tin-moi-nhat.rss",
            blockedWords: "scandal, drama",
            highlightedWords: "Manchester United, Giá vàng"
        };
        this.itemsLimit = 10;
        this.currentItems = [];
        this.currentSourceTitle = "";
        
        this.loadConfig();
        this.render();
        this.fetchRSS();
        
        window.addEventListener("layoutUpdated", (e) => {
            if (e.detail && e.detail.key === "showRss") {
                fadeToggle(this.container, e.detail.value, "flex");
            }
        });
        
        this.applyAppearance();
        fadeToggle(this.container, getSettings().showRss === true, "flex");
    }

    applyAppearance() {
        const settings = getSettings();
        
        // Skin
        const skin = settings.rssSkin || "default";
        this.container.classList.toggle("skin-white-blur", skin === "white-blur");
        this.container.classList.toggle("skin-m3-accent", skin === "m3-accent");
        this.container.classList.toggle("skin-transparent", skin === "transparent");
        this.container.classList.toggle("skin-light-transparent", skin === "light-transparent");
        
        // Border
        const hideBorder = settings.rssHideBorder === true;
        this.container.classList.toggle("widget-border-hidden", hideBorder);
        
        // Expand / Mini
        const isMini = settings.rssMini === true;
        const isExpanded = settings.rssExpanded === true && !isMini;
        this.container.classList.toggle("rss-mini", isMini);
        this.container.classList.toggle("rss-expanded", isExpanded);
    }

    loadConfig() {
        const saved = localStorage.getItem("rssWidgetConfig");
        if (saved) {
            try {
                this.config = { ...this.config, ...JSON.parse(saved) };
            } catch (e) {}
        }
    }

    saveConfig() {
        localStorage.setItem("rssWidgetConfig", JSON.stringify(this.config));
    }

    render() {
        this.container.innerHTML = `
            <div class="rss-header">
                <span><i class="fa-solid fa-rss"></i> RSS News</span>
                <div class="rss-actions">
                    <button class="rss-refresh-btn" title="Refresh"><i class="fa-solid fa-rotate-right"></i></button>
                    <button class="rss-settings-btn" title="Settings"><i class="fa-solid fa-gear"></i></button>
                </div>
            </div>
            
            <div class="rss-settings">
                <div class="rss-settings-group">
                    <label>RSS URL</label>
                    <select id="rss-presets" class="rss-input" style="margin-bottom: 5px; cursor: pointer;">
                        <option value="">-- Gợi ý nguồn RSS (Chọn nhanh) --</option>
                        <option value="https://vnexpress.net/rss/tin-moi-nhat.rss">VNExpress - Mới nhất</option>
                        <option value="https://vnexpress.net/rss/the-thao.rss">VNExpress - Bóng đá, Thể thao</option>
                        <option value="https://vnexpress.net/rss/kinh-doanh.rss">VNExpress - Kinh doanh, Chứng khoán</option>
                        <option value="https://vnexpress.net/rss/giai-tri.rss">VNExpress - Giải trí, Showbiz</option>
                        <option value="https://tuoitre.vn/rss/tin-moi-nhat.rss">Tuổi Trẻ - Mới nhất</option>
                        <option value="https://thanhnien.vn/rss/home.rss">Thanh Niên - Tin tức</option>
                        <option value="https://dantri.com.vn/rss/home.rss">Dân Trí - Trang chủ</option>
                    </select>
                    <input type="url" class="rss-input" id="rss-url" value="${this.config.url}">
                    <div style="margin-top: 5px; display: flex; gap: 5px; flex-wrap: wrap;">
                        <a href="https://vnexpress.net/rss" target="_blank" class="rss-source-link">🔗 Lấy RSS VNExpress</a>
                        <a href="https://tuoitre.vn/rss.htm" target="_blank" class="rss-source-link">🔗 Lấy RSS Tuổi Trẻ</a>
                        <a href="https://thanhnien.vn/rss.html" target="_blank" class="rss-source-link">🔗 Lấy RSS Thanh Niên</a>
                    </div>
                </div>
                <div class="rss-settings-group">
                    <label>Block Keywords (comma separated)</label>
                    <input type="text" class="rss-input" id="rss-block" value="${this.config.blockedWords}" placeholder="scandal, drama">
                </div>
                <div class="rss-settings-group">
                    <label>Highlight Keywords (comma separated)</label>
                    <input type="text" class="rss-input" id="rss-highlight" value="${this.config.highlightedWords}" placeholder="Manchester United">
                </div>
                <button class="rss-save-btn">Save & Reload</button>
            </div>

            <div class="rss-content">
                <div style="text-align:center; padding:20px; opacity:0.7;">Loading feeds...</div>
            </div>
        `;

        this.contentEl = this.container.querySelector('.rss-content');
        this.settingsEl = this.container.querySelector('.rss-settings');
        
        this.container.querySelector('.rss-refresh-btn').addEventListener('click', () => this.fetchRSS(true));
        this.container.querySelector('.rss-settings-btn').addEventListener('click', () => {
            this.settingsEl.classList.toggle('active');
            this.contentEl.style.display = this.settingsEl.classList.contains('active') ? 'none' : 'flex';
        });

        const presetSelect = this.container.querySelector('#rss-presets');
        const urlInput = this.container.querySelector('#rss-url');
        if (presetSelect && urlInput) {
            presetSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    urlInput.value = e.target.value;
                }
            });
        }

        this.container.querySelector('.rss-save-btn').addEventListener('click', () => {
            this.config.url = this.container.querySelector('#rss-url').value;
            this.config.blockedWords = this.container.querySelector('#rss-block').value;
            this.config.highlightedWords = this.container.querySelector('#rss-highlight').value;
            this.saveConfig();
            
            this.settingsEl.classList.remove('active');
            this.contentEl.style.display = 'flex';
            this.fetchRSS(true);
        });
    }

    async fetchRawXML(url) {
        const proxies = [
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        ];
        
        for (const proxy of proxies) {
            try {
                const res = await fetch(proxy);
                if (res.ok) {
                    const text = await res.text();
                    if (text && (text.includes('<rss') || text.includes('<feed'))) {
                        return text;
                    }
                }
            } catch (e) {
                console.warn("Proxy failed:", proxy, e);
            }
        }
        throw new Error("All XML proxies failed");
    }

    async fetchRSS(forceRefresh = false) {
        this.contentEl.innerHTML = `<div style="text-align:center; padding:20px; opacity:0.7;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
        
        if (!this.config.url) {
            this.contentEl.innerHTML = `<div style="text-align:center; padding:20px; opacity:0.7;">No RSS URL configured.</div>`;
            return;
        }

        const cacheKey = `rss_cache_${this.config.url}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(`${cacheKey}_time`);
        
        // Cache duration: 15 minutes
        const isCacheValid = !forceRefresh && cachedData && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp) < 15 * 60 * 1000);

        if (isCacheValid) {
            try {
                const data = JSON.parse(cachedData);
                this.currentItems = data.items;
                this.currentSourceTitle = data.feed.title;
                this.itemsLimit = 10;
                this.renderItems();
                // Optionally fetch in background to refresh cache silently
                this.fetchRSSBackground(cacheKey);
                return;
            } catch (e) {}
        }

        try {
            const rawXml = await this.fetchRawXML(this.config.url);
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawXml, "text/xml");
            
            const sourceTitle = xmlDoc.querySelector("channel > title")?.textContent || "RSS Feed";
            const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => {
                let thumbnail = "";
                const enclosure = item.querySelector("enclosure");
                if (enclosure && enclosure.getAttribute("type")?.startsWith("image/")) {
                    thumbnail = enclosure.getAttribute("url");
                } else {
                    const content = item.getElementsByTagName("content:encoded")[0]?.textContent || item.querySelector("description")?.textContent || "";
                    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) thumbnail = imgMatch[1];
                }
                
                let desc = item.querySelector("description")?.textContent || "";
                desc = desc.replace(/<[^>]*>?/gm, '').trim();
                if (desc.length > 120) desc = desc.substring(0, 120) + "...";

                return {
                    title: item.querySelector("title")?.textContent || "",
                    link: item.querySelector("link")?.textContent || "",
                    pubDate: item.querySelector("pubDate")?.textContent || "",
                    thumbnail: thumbnail,
                    description: desc
                };
            });

            const parsedData = { feed: { title: sourceTitle }, items: items };

            localStorage.setItem(cacheKey, JSON.stringify(parsedData));
            localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

            this.currentItems = parsedData.items;
            this.currentSourceTitle = parsedData.feed.title;
            this.itemsLimit = 10;
            this.renderItems();
        } catch (error) {
            console.error("RSS Fetch via allorigins Error:", error);
            // Fallback to rss2json if allorigins fails (e.g. 522 timeout)
            try {
                const res2 = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(this.config.url)}`);
                if (!res2.ok) throw new Error("Fallback network response was not ok");
                const data2 = await res2.json();
                
                if (data2.status === 'ok') {
                    const parsedData = { feed: { title: data2.feed.title }, items: data2.items };
                    localStorage.setItem(cacheKey, JSON.stringify(parsedData));
                    localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

                    this.currentItems = parsedData.items;
                    this.currentSourceTitle = parsedData.feed.title;
                    this.itemsLimit = 10;
                    this.renderItems();
                    return;
                }
            } catch (fallbackError) {
                console.error("RSS Fetch via rss2json Error:", fallbackError);
            }

            if (cachedData) {
                try {
                    const data = JSON.parse(cachedData);
                    this.currentItems = data.items;
                    this.currentSourceTitle = data.feed.title;
                    this.itemsLimit = 10;
                    this.renderItems();
                    return;
                } catch(e) {}
            }
            this.contentEl.innerHTML = `<div style="text-align:center; padding:20px; color:#ff6b6b;">Failed to load RSS feed.</div>`;
        }
    }

    async fetchRSSBackground(cacheKey) {
        try {
            const rawXml = await this.fetchRawXML(this.config.url);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawXml, "text/xml");
            
            const sourceTitle = xmlDoc.querySelector("channel > title")?.textContent || "RSS Feed";
            const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => {
                let thumbnail = "";
                const enclosure = item.querySelector("enclosure");
                if (enclosure && enclosure.getAttribute("type")?.startsWith("image/")) {
                    thumbnail = enclosure.getAttribute("url");
                } else {
                    const content = item.getElementsByTagName("content:encoded")[0]?.textContent || item.querySelector("description")?.textContent || "";
                    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) thumbnail = imgMatch[1];
                }
                
                let desc = item.querySelector("description")?.textContent || "";
                desc = desc.replace(/<[^>]*>?/gm, '').trim();
                if (desc.length > 120) desc = desc.substring(0, 120) + "...";

                return {
                    title: item.querySelector("title")?.textContent || "",
                    link: item.querySelector("link")?.textContent || "",
                    pubDate: item.querySelector("pubDate")?.textContent || "",
                    thumbnail: thumbnail,
                    description: desc
                };
            });

            const parsedData = { feed: { title: sourceTitle }, items: items };
            localStorage.setItem(cacheKey, JSON.stringify(parsedData));
            localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        } catch (e) {
            try {
                const res2 = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(this.config.url)}`);
                if (res2.ok) {
                    const data2 = await res2.json();
                    if (data2.status === 'ok') {
                        const parsedData = { feed: { title: data2.feed.title }, items: data2.items };
                        localStorage.setItem(cacheKey, JSON.stringify(parsedData));
                        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
                    }
                }
            } catch (fallbackError) {}
        }
    }

    renderItems() {
        const items = this.currentItems;
        const sourceTitle = this.currentSourceTitle;
        const blockWords = this.config.blockedWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
        const highlightWords = this.config.highlightedWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);

        let html = '';
        let count = 0;

        for (const item of items) {
            if (count >= this.itemsLimit) break;
            
            const title = item.title || "";
            const lowerTitle = title.toLowerCase();

            // Check blocked words
            const isBlocked = blockWords.some(word => lowerTitle.includes(word));
            if (isBlocked) continue;

            // Check highlighted words
            const isHighlight = highlightWords.some(word => lowerTitle.includes(word));
            
            // Extract image
            let imageUrl = item.thumbnail || "";
            
            // Format Date
            let dateStr = "";
            if (item.pubDate) {
                const d = new Date(item.pubDate);
                if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            // Ensure description is plain text (handle fallback data)
            let safeDesc = item.description || "";
            if (safeDesc.includes('<')) {
                safeDesc = safeDesc.replace(/<[^>]*>?/gm, '').trim();
            }
            if (safeDesc.length > 120) safeDesc = safeDesc.substring(0, 120) + "...";

            html += `
                <a href="${item.link}" target="_blank" class="rss-item ${isHighlight ? 'highlight' : ''}">
                    ${imageUrl ? `<img src="${imageUrl}" style="width: 68px; height: 68px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div class="rss-item-title">${title}</div>
                        ${safeDesc ? `<div class="rss-item-desc">${safeDesc}</div>` : ''}
                        <div class="rss-item-source">
                            <i class="fa-solid fa-newspaper" style="font-size: 0.8em;"></i> ${sourceTitle} ${dateStr ? '• <i class="fa-regular fa-clock" style="font-size: 0.8em; margin-left: 2px;"></i> ' + dateStr : ''}
                        </div>
                    </div>
                </a>
            `;
            count++;
        }

        if (count === 0) {
            html = `<div style="text-align:center; padding:20px; opacity:0.7;">Không có tin nào hoặc bị lọc hết.</div>`;
        } else if (count >= this.itemsLimit && items.length > this.itemsLimit) {
            html += `<button class="rss-load-more" style="margin-top: 10px; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--text-color); cursor: pointer; transition: background 0.2s; font-family: inherit;">Xem thêm tin cũ hơn...</button>`;
        }

        this.contentEl.innerHTML = html;
        
        const loadMoreBtn = this.contentEl.querySelector('.rss-load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.itemsLimit += 10;
                this.renderItems();
            });
        }
    }
}
