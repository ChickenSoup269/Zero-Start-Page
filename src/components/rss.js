import { fadeToggle } from "../utils/dom.js"
import { getSettings } from "../services/state.js"

export class RssReader {
    constructor(container) {
        this.container = container;
        this.activeTabIndex = 0;
        this.config = {
            feeds: [
                { name: "Tin mới nhất", url: "https://vnexpress.net/rss/tin-moi-nhat.rss" },
                { name: "Tin nổi bật", url: "https://vnexpress.net/rss/tin-noi-bat.rss" },
                { name: "Tin xem nhiều", url: "https://vnexpress.net/rss/tin-xem-nhieu.rss" },
                { name: "Thời sự", url: "https://vnexpress.net/rss/thoi-su.rss" },
                { name: "Thế giới", url: "https://vnexpress.net/rss/the-gioi.rss" },
                { name: "Kinh doanh", url: "https://vnexpress.net/rss/kinh-doanh.rss" },
                { name: "Bất động sản", url: "https://vnexpress.net/rss/bat-dong-san.rss" },
                { name: "Thể thao", url: "https://vnexpress.net/rss/the-thao.rss" },
                { name: "Giải trí", url: "https://vnexpress.net/rss/giai-tri.rss" },
                { name: "Pháp luật", url: "https://vnexpress.net/rss/phap-luat.rss" },
                { name: "Giáo dục", url: "https://vnexpress.net/rss/giao-duc.rss" },
                { name: "Sức khỏe", url: "https://vnexpress.net/rss/suc-khoe.rss" },
                { name: "Đời sống", url: "https://vnexpress.net/rss/gia-dinh.rss" },
                { name: "Du lịch", url: "https://vnexpress.net/rss/du-lich.rss" },
                { name: "Khoa học", url: "https://vnexpress.net/rss/khoa-hoc.rss" },
                { name: "Công nghệ", url: "https://vnexpress.net/rss/so-hoa.rss" },
                { name: "Xe", url: "https://vnexpress.net/rss/oto-xe-may.rss" },
                { name: "Góc nhìn", url: "https://vnexpress.net/rss/goc-nhin.rss" },
                { name: "Ý kiến", url: "https://vnexpress.net/rss/y-kien.rss" },
                { name: "Tâm sự", url: "https://vnexpress.net/rss/tam-su.rss" },
                { name: "Thư giãn", url: "https://vnexpress.net/rss/cuoi.rss" }
            ],
            blockedWords: "scandal, drama",
            highlightedWords: "Manchester United, Giá vàng",
            showImages: true
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
                const parsed = JSON.parse(saved);
                if (parsed.url && !parsed.feeds) {
                    parsed.feeds = [{ name: "Trang chủ", url: parsed.url }];
                    delete parsed.url;
                }
                if (parsed.showImages === undefined) parsed.showImages = true;
                this.config = { ...this.config, ...parsed };
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
               <div class="rss-tabs" style="display: none;"></div>

            <div class="rss-settings">
                <div class="rss-settings-group">
                    <label>Danh sách Nguồn RSS (Tên Tab | Link - Mỗi dòng 1 nguồn)</label>
                    <div style="margin-bottom: 5px;">
                        <button type="button" class="rss-preset-toggle" style="width:100%; text-align:left; padding:8px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:var(--text-color); border-radius:6px; cursor:pointer; font-size:0.9em; transition: background 0.2s;">
                            <i class="fa-solid fa-list-ul"></i> Gợi ý nguồn RSS (Bấm để chọn) <i class="fa-solid fa-chevron-down" style="float:right; margin-top:2px;"></i>
                        </button>
                        <div class="rss-preset-list-container" style="display:none; flex-direction:column; gap:10px; padding:10px; background:rgba(0,0,0,0.1); border:1px solid rgba(255,255,255,0.05); border-radius:6px; margin-top:5px; max-height: 200px; overflow-y: auto;">
                            
                            <div style="font-weight:600; font-size:0.85em; opacity:0.8; margin-bottom:2px;"><i class="fa-regular fa-newspaper" style="margin-right:4px;"></i> Việt Nam</div>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Mới nhất | https://vnexpress.net/rss/tin-moi-nhat.rss">VNE Mới nhất</button>
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Nổi bật | https://vnexpress.net/rss/tin-noi-bat.rss">VNE Nổi bật</button>
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Thời sự | https://vnexpress.net/rss/thoi-su.rss">VNE Thời sự</button>
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Thế giới | https://vnexpress.net/rss/the-gioi.rss">VNE Thế giới</button>
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Thể thao | https://vnexpress.net/rss/the-thao.rss">VNE Thể thao</button>
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Kinh doanh | https://vnexpress.net/rss/kinh-doanh.rss">VNE Kinh doanh</button>
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Giáo dục | https://vnexpress.net/rss/giao-duc.rss">VNE Giáo dục</button>
                                <button type="button" class="rss-preset-btn" data-value="VNExpress - Công nghệ | https://vnexpress.net/rss/so-hoa.rss">VNE Công nghệ</button>
                                <button type="button" class="rss-preset-btn" data-value="Tuổi Trẻ - Mới nhất | https://tuoitre.vn/rss/tin-moi-nhat.rss">Tuổi Trẻ</button>
                                <button type="button" class="rss-preset-btn" data-value="Thanh Niên - Tin tức | https://thanhnien.vn/rss/home.rss">Thanh Niên</button>
                                <button type="button" class="rss-preset-btn" data-value="Dân Trí - Trang chủ | https://dantri.com.vn/rss/home.rss">Dân Trí</button>
                            </div>

                            <div style="font-weight:600; font-size:0.85em; opacity:0.8; margin-bottom:2px; margin-top:5px;"><i class="fa-solid fa-globe" style="margin-right:4px;"></i> Quốc Tế</div>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                                <button type="button" class="rss-preset-btn" data-value="CNN Top Stories | http://rss.cnn.com/rss/edition.rss">CNN</button>
                                <button type="button" class="rss-preset-btn" data-value="BBC World | http://feeds.bbci.co.uk/news/world/rss.xml">BBC</button>
                                <button type="button" class="rss-preset-btn" data-value="NYT World | https://rss.nytimes.com/services/xml/rss/nyt/World.xml">NYT</button>
                                <button type="button" class="rss-preset-btn" data-value="TechCrunch | https://techcrunch.com/feed/">TechCrunch</button>
                                <button type="button" class="rss-preset-btn" data-value="The Verge | https://www.theverge.com/rss/index.xml">The Verge</button>
                                <button type="button" class="rss-preset-btn" data-value="Wired | https://www.wired.com/feed/rss">Wired</button>
                            </div>
                        </div>
                    </div>
                    <textarea class="rss-input" id="rss-feeds" rows="4" style="resize: vertical; white-space: pre;" placeholder="Ví dụ:&#10;Tin Công Nghệ | https://vnexpress.net/rss/so-hoa.rss&#10;Kinh doanh | https://dantri.com.vn/rss/kinh-doanh.rss"></textarea>
                    <div style="margin-top: 5px; display: flex; gap: 5px; flex-wrap: wrap;">
                        <a href="https://vnexpress.net/rss" target="_blank" class="rss-source-link"><i class="fa-solid fa-link" style="margin-right:2px;"></i> Lấy RSS VNExpress</a>
                        <a href="https://tuoitre.vn/rss.htm" target="_blank" class="rss-source-link"><i class="fa-solid fa-link" style="margin-right:2px;"></i> Lấy RSS Tuổi Trẻ</a>
                    </div>
                </div>
                <div class="rss-settings-group">
                    <label>Từ khóa bị chặn (ngăn cách bởi dấu phẩy)</label>
                    <input type="text" class="rss-input" id="rss-block" value="${this.config.blockedWords}" placeholder="scandal, drama">
                </div>
                <div class="rss-settings-group">
                    <label>Từ khóa nổi bật (ngăn cách bởi dấu phẩy)</label>
                    <input type="text" class="rss-input" id="rss-highlight" value="${this.config.highlightedWords}" placeholder="Manchester United">
                </div>
                <div class="rss-settings-group" style="flex-direction: row; align-items: center; gap: 8px;">
                    <input type="checkbox" id="rss-show-images" ${this.config.showImages ? 'checked' : ''} style="cursor: pointer;">
                    <label for="rss-show-images" style="cursor: pointer; opacity: 1; margin: 0;">Hiển thị ảnh đại diện báo</label>
                </div>
                <button class="rss-save-btn">Lưu & Tải lại</button>
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
            const isActive = this.settingsEl.classList.contains('active');
            this.contentEl.style.display = isActive ? 'none' : 'flex';
            
            const tabsEl = this.container.querySelector('.rss-tabs');
            if (tabsEl) {
                if (isActive) {
                    tabsEl.style.display = 'none';
                } else {
                    this.renderTabs();
                }
            }
        });

        const feedsTextarea = this.container.querySelector('#rss-feeds');
        
        if (feedsTextarea) {
            feedsTextarea.value = this.config.feeds.map(f => `${f.name} | ${f.url}`).join('\n');
        }

        const toggleBtn = this.container.querySelector('.rss-preset-toggle');
        const listContainer = this.container.querySelector('.rss-preset-list-container');
        if (toggleBtn && listContainer) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = listContainer.style.display === 'none';
                listContainer.style.display = isHidden ? 'flex' : 'none';
                toggleBtn.querySelector('i.fa-chevron-down, i.fa-chevron-up').className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
            });
            toggleBtn.addEventListener('mouseover', () => toggleBtn.style.background = 'rgba(255,255,255,0.1)');
            toggleBtn.addEventListener('mouseout', () => toggleBtn.style.background = 'rgba(0,0,0,0.2)');
        }

        const presetBtns = this.container.querySelectorAll('.rss-preset-btn');
        if (feedsTextarea) {
            presetBtns.forEach(btn => {
                btn.style.padding = '4px 10px';
                btn.style.background = 'rgba(255,255,255,0.1)';
                btn.style.border = 'none';
                btn.style.borderRadius = '12px';
                btn.style.fontSize = '0.8em';
                btn.style.color = 'var(--text-color)';
                btn.style.cursor = 'pointer';
                btn.style.transition = 'background 0.2s';
                btn.addEventListener('mouseover', () => btn.style.background = 'rgba(255,255,255,0.2)');
                btn.addEventListener('mouseout', () => btn.style.background = 'rgba(255,255,255,0.1)');
                
                btn.addEventListener('click', () => {
                    const value = btn.getAttribute('data-value');
                    if (value) {
                        let val = feedsTextarea.value.trim();
                        if (val) val += '\n';
                        feedsTextarea.value = val + '\n' + value;
                        // Provide a small visual feedback
                        btn.style.background = 'var(--accent-color, #4facfe)';
                        btn.style.color = '#fff';
                        setTimeout(() => {
                            btn.style.background = 'rgba(255,255,255,0.2)';
                            btn.style.color = 'var(--text-color)';
                        }, 200);
                    }
                });
            });
        }

        this.container.querySelector('.rss-save-btn').addEventListener('click', () => {
            const lines = this.container.querySelector('#rss-feeds').value.split('\n');
            this.config.feeds = lines.map(line => {
                const parts = line.split('|');
                return { name: parts[0]?.trim() || 'Feed', url: parts[1]?.trim() || '' };
            }).filter(f => f.url);
            
            if (this.config.feeds.length === 0) {
                this.config.feeds = [
                    { name: "Tin mới nhất", url: "https://vnexpress.net/rss/tin-moi-nhat.rss" },
                    { name: "Tin nổi bật", url: "https://vnexpress.net/rss/tin-noi-bat.rss" },
                    { name: "Tin xem nhiều", url: "https://vnexpress.net/rss/tin-xem-nhieu.rss" },
                    { name: "Thời sự", url: "https://vnexpress.net/rss/thoi-su.rss" },
                    { name: "Thế giới", url: "https://vnexpress.net/rss/the-gioi.rss" },
                    { name: "Kinh doanh", url: "https://vnexpress.net/rss/kinh-doanh.rss" },
                    { name: "Bất động sản", url: "https://vnexpress.net/rss/bat-dong-san.rss" },
                    { name: "Thể thao", url: "https://vnexpress.net/rss/the-thao.rss" },
                    { name: "Giải trí", url: "https://vnexpress.net/rss/giai-tri.rss" },
                    { name: "Pháp luật", url: "https://vnexpress.net/rss/phap-luat.rss" },
                    { name: "Giáo dục", url: "https://vnexpress.net/rss/giao-duc.rss" },
                    { name: "Sức khỏe", url: "https://vnexpress.net/rss/suc-khoe.rss" },
                    { name: "Đời sống", url: "https://vnexpress.net/rss/gia-dinh.rss" },
                    { name: "Du lịch", url: "https://vnexpress.net/rss/du-lich.rss" },
                    { name: "Khoa học", url: "https://vnexpress.net/rss/khoa-hoc.rss" },
                    { name: "Công nghệ", url: "https://vnexpress.net/rss/so-hoa.rss" },
                    { name: "Xe", url: "https://vnexpress.net/rss/oto-xe-may.rss" },
                    { name: "Góc nhìn", url: "https://vnexpress.net/rss/goc-nhin.rss" },
                    { name: "Ý kiến", url: "https://vnexpress.net/rss/y-kien.rss" },
                    { name: "Tâm sự", url: "https://vnexpress.net/rss/tam-su.rss" },
                    { name: "Thư giãn", url: "https://vnexpress.net/rss/cuoi.rss" }
                ];
            }

            this.config.blockedWords = this.container.querySelector('#rss-block').value;
            this.config.highlightedWords = this.container.querySelector('#rss-highlight').value;
            this.config.showImages = this.container.querySelector('#rss-show-images').checked;
            this.saveConfig();
            
            this.settingsEl.classList.remove('active');
            this.contentEl.style.display = 'flex';
            this.activeTabIndex = 0;
            this.renderTabs();
            this.fetchRSS(true);
        });

        this.renderTabs();
    }

    renderTabs() {
        const tabsEl = this.container.querySelector('.rss-tabs');
        if (!tabsEl) return;
        
        if (!this.config.feeds || this.config.feeds.length <= 1) {
            tabsEl.style.display = 'none';
        } else {
            tabsEl.style.display = 'flex';
            tabsEl.innerHTML = this.config.feeds.map((feed, idx) => `
                <div class="rss-tab ${idx === this.activeTabIndex ? 'active' : ''}" data-index="${idx}">
                    ${feed.name}
                </div>
            `).join('');
            
            tabsEl.querySelectorAll('.rss-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.activeTabIndex = parseInt(e.target.dataset.index);
                    this.renderTabs(); // update active state
                    this.fetchRSS(false);
                });
            });
        }
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
        
        const currentFeed = this.config.feeds[this.activeTabIndex];
        if (!currentFeed || !currentFeed.url) {
            this.contentEl.innerHTML = `<div style="text-align:center; padding:20px; opacity:0.7;">No RSS Feed configured.</div>`;
            return;
        }

        const url = currentFeed.url;
        const cacheKey = `rss_cache_${url}`;
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
                this.fetchRSSBackground(cacheKey, url);
                return;
            } catch (e) {}
        }

        try {
            const rawXml = await this.fetchRawXML(url);
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawXml, "text/xml");
            
            const sourceTitle = xmlDoc.querySelector("channel > title")?.textContent || "RSS Feed";
            const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => {
                let thumbnail = "";
                const mediaContent = item.getElementsByTagName("media:content")[0];
                const enclosure = item.querySelector("enclosure");
                if (mediaContent && mediaContent.getAttribute("url")) {
                    thumbnail = mediaContent.getAttribute("url");
                } else if (enclosure && enclosure.getAttribute("type")?.startsWith("image/")) {
                    thumbnail = enclosure.getAttribute("url");
                } else {
                    const content = item.getElementsByTagName("content:encoded")[0]?.textContent || item.querySelector("description")?.textContent || "";
                    const imgMatch = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
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
                const res2 = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
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

    async fetchRSSBackground(cacheKey, url) {
        try {
            const rawXml = await this.fetchRawXML(url);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawXml, "text/xml");
            
            const sourceTitle = xmlDoc.querySelector("channel > title")?.textContent || "RSS Feed";
            const items = Array.from(xmlDoc.querySelectorAll("item")).map(item => {
                let thumbnail = "";
                const mediaContent = item.getElementsByTagName("media:content")[0];
                const enclosure = item.querySelector("enclosure");
                if (mediaContent && mediaContent.getAttribute("url")) {
                    thumbnail = mediaContent.getAttribute("url");
                } else if (enclosure && enclosure.getAttribute("type")?.startsWith("image/")) {
                    thumbnail = enclosure.getAttribute("url");
                } else {
                    const content = item.getElementsByTagName("content:encoded")[0]?.textContent || item.querySelector("description")?.textContent || "";
                    const imgMatch = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
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
                const res2 = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
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
            if (!imageUrl && item.enclosure && item.enclosure.link) {
                imageUrl = item.enclosure.link;
            }
            if (!imageUrl && (item.content || item.description)) {
                const text = item.content || item.description || "";
                const match = text.match(/<img[^>]+src=["']([^"'>]+)["']/i);
                if (match) imageUrl = match[1];
            }
            
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
                    ${(this.config.showImages && imageUrl) ? `<img src="${imageUrl}" style="width: 68px; height: 68px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
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
