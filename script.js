document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const clockElement = document.getElementById("clock")
  const dateElement = document.getElementById("date")
  const searchInput = document.getElementById("search-input")
  const clearBtn = document.getElementById("clear-btn")
  const bookmarksContainer = document.getElementById("bookmarks-container")
  const modal = document.getElementById("bookmark-modal")
  const closeModalBtn = document.querySelector(".close")
  const saveBookmarkBtn = document.getElementById("save-bookmark")
  const bookmarkTitleInput = document.getElementById("bookmark-title")
  const bookmarkUrlInput = document.getElementById("bookmark-url")
  const bookmarkIconInput = document.getElementById("bookmark-icon-url")
  const modalTitle = document.getElementById("modal-title")

  // Context Menu Elements
  const contextMenu = document.getElementById("context-menu")
  const menuEdit = document.getElementById("menu-edit")
  const menuDelete = document.getElementById("menu-delete")

  // Import Elements
  const manualEntryForm = document.getElementById("manual-entry-form")
  const importSection = document.getElementById("import-section")
  const showImportBtn = document.getElementById("show-import-btn")
  const backToManualBtn = document.getElementById("back-to-manual")
  const browserBookmarksList = document.getElementById("browser-bookmarks-list")
  const confirmImportBtn = document.getElementById("confirm-import-btn")

  // Settings Elements
  const settingsToggle = document.getElementById("settings-toggle")
  const settingsSidebar = document.getElementById("settings-sidebar")
  const closeSettings = document.getElementById("close-settings")
  const bgInput = document.getElementById("bg-input")
  const bgColorPicker = document.getElementById("bg-color-picker")
  const accentColorPicker = document.getElementById("accent-color-picker")
  const fontSelect = document.getElementById("font-select")
    const languageSelect = document.getElementById("language-select")
  const effectSelect = document.getElementById("effect-select")
  const gradientStartPicker = document.getElementById("gradient-start-picker")
  const gradientEndPicker = document.getElementById("gradient-end-picker")
  const gradientAngleInput = document.getElementById("gradient-angle-input")
  const gradientAngleValue = document.getElementById("gradient-angle-value")
  const resetSettingsBtn = document.getElementById("reset-settings")
  const dateFormatSelect = document.getElementById("date-format-select")
  const clockSizeInput = document.getElementById("clock-size-input")
  const clockSizeValue = document.getElementById("clock-size-value")

  // --- State ---
  let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || []
  let editingIndex = null
  let contextMenuTargetIndex = -1
  // Use correct settings defaults including language and accent
  let settings = JSON.parse(localStorage.getItem("pageSettings")) || {
    background: "",
    font: "'Outfit', sans-serif",
    dateFormat: "full",
    clockSize: "6",
    language: "en",
    accentColor: "#0f0c29",
    effect: "none",
    gradientStart: "#0f0c29",
    gradientEnd: "#302b63",
    gradientAngle: "135"
  }

  // --- Star Fall Effect Class ---
  class StarFall {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.active = false;
        this.animationFrame = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.createStars();
        this.animate();
        this.canvas.style.display = 'block';
    }

    stop() {
        this.active = false;
        cancelAnimationFrame(this.animationFrame);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.display = 'none';
        this.stars = [];
    }

    createStars() {
        const count = 100;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                length: Math.random() * 20 + 10,
                speed: Math.random() * 5 + 2,
                opacity: Math.random()
            });
        }
    }

    animate() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;

        this.stars.forEach(star => {
            this.ctx.beginPath();
            const tailX = star.x + star.length * 0.5; // Angled slightly? Let's do straight down or angled
            // Let's do a "Star Fall" / Rain effect (falling down)
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(star.x, star.y + star.length);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${star.opacity})`;
            this.ctx.stroke();

            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = -star.length;
                star.x = Math.random() * this.canvas.width;
            }
        });

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
}

  const starFallEffect = new StarFall('effect-canvas');

  // --- Translations ---
  const translations = {
    en: {
      settings_title: "Settings",
      settings_language: "Language",
      settings_bg: "Background",
      settings_bg_placeholder: "URL or Color (e.g. #333)",
      settings_accent: "Accent Color",
      settings_starfall: "Galaxy Effect",
      settings_font: "Font",
      settings_date_format: "Date Format",
      settings_clock_size: "Clock Size:",
      settings_reset: "Reset Defaults",
      search_placeholder: "Search Google...",
      menu_edit: "Edit",
      menu_delete: "Delete",
      modal_add_title: "Add Bookmark",
      modal_edit_title: "Edit Bookmark",
      modal_import_title: "Import from Browser",
      modal_title_placeholder: "Title",
      modal_url_placeholder: "URL (e.g., https://example.com)",
      modal_icon_placeholder: "Custom Icon URL (Optional)",
      modal_save: "Save",
      modal_import: "Import from Browser",
      modal_back: "Back to Manual",
      modal_import_selected: "Import Selected",
      alert_api_unavailable:
        "Browser Bookmarks API is not available. Please run as extension.",
      alert_missing_fields: "Please enter both a title and a URL.",
      alert_reset: "Reset all settings to default?",
      alert_delete_confirm: "Delete bookmark",
      alert_imported: "Imported {count} bookmarks!",
      alert_no_selection: "No new bookmarks selected or they already exist.",
    },
    vi: {
      settings_title: "Cài đặt",
      settings_language: "Ngôn ngữ",
      settings_bg: "Hình nền",
      settings_bg_placeholder: "URL hoặc Mã màu (vd: #333)",
      settings_accent: "Màu chủ đạo",
      settings_starfall: "Hiệu ứng Ngân Hà",
      settings_font: "Phông chữ",
      settings_date_format: "Định dạng ngày",
      settings_clock_size: "Kích thước đồng hồ:",
      settings_reset: "Khôi phục mặc định",
      search_placeholder: "Tìm kiếm Google...",
      menu_edit: "Sửa",
      menu_delete: "Xóa",
      modal_add_title: "Thêm dấu trang",
      modal_edit_title: "Sửa dấu trang",
      modal_import_title: "Nhập từ trình duyệt",
      modal_title_placeholder: "Tiêu đề",
      modal_url_placeholder: "Đường dẫn (URL)",
      modal_icon_placeholder: "URL biểu tượng (Tùy chọn)",
      modal_save: "Lưu",
      modal_import: "Nhập từ trình duyệt",
      modal_back: "Quay lại",
      modal_import_selected: "Nhập đã chọn",
      alert_api_unavailable:
        "API Dấu trang không khả dụng. Vui lòng chạy dưới dạng tiện ích mở rộng.",
      alert_missing_fields: "Vui lòng nhập cả tiêu đề và đường dẫn.",
      alert_reset: "Khôi phục tất cả cài đặt về mặc định?",
      alert_delete_confirm: "Xóa dấu trang",
      alert_imported: "Đã nhập {count} dấu trang!",
      alert_no_selection: "Chưa chọn dấu trang mới hoặc đã tồn tại.",
    },
  }

  function updateLanguage() {
    const lang = settings.language || "en"
    const t = translations[lang]

    // Update Text Content with data-i18n
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n")
      if (t[key]) el.textContent = t[key]
    })

    // Update Placeholders with data-i18n-placeholder
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder")
      if (t[key]) el.placeholder = t[key]
    })

    // Update Date
    updateTime()
  }

  // --- Functions ---

  // 1. Clock & Date
  function updateTime() {
    const now = new Date()
    const timeString = now.toLocaleTimeString(
      settings.language === "vi" ? "vi-VN" : "en-US",
      { hour12: false }
    )
    clockElement.textContent = timeString

    let dateString = ""
    const format = settings.dateFormat || "full"
    const langCode = settings.language === "vi" ? "vi-VN" : "en-US"

    if (format === "full") {
      const options = {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
      dateString = now.toLocaleDateString(langCode, options)
    } else if (format === "short") {
      dateString = now.toLocaleDateString("en-GB") // DD/MM/YYYY
    } else if (format === "us") {
      dateString = now.toLocaleDateString("en-US") // MM/DD/YYYY
    } else if (format === "iso") {
      dateString = now.toISOString().split("T")[0] // YYYY-MM-DD
    }

    dateElement.textContent = dateString
  }

  function colourNameToHex(colour)
  {
      var colours = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
      "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
      "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
      "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
      "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
      "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
      "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
      "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
      "honeydew":"#f0fff0","hotpink":"#ff69b4",
      "indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
      "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
      "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
      "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
      "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
      "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
      "navajowhite":"#ffdead","navy":"#000080",
      "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
      "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
      "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
      "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
      "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
      "violet":"#ee82ee",
      "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
      "yellow":"#ffff00","yellowgreen":"#9acd32"};

      if (typeof colours[colour.toLowerCase()] != 'undefined')
          return colours[colour.toLowerCase()];

      return colour;
  }

  function getContrastYIQ(hexcolor){
    hexcolor = colourNameToHex(hexcolor)
    hexcolor = hexcolor.replace("#", "");
    var r = parseInt(hexcolor.substr(0,2),16);
    var g = parseInt(hexcolor.substr(2,2),16);
    var b = parseInt(hexcolor.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'black' : 'white';
  }

  // 2. Settings
  function applySettings() {
    // Background
    if (settings.background) {
      document.body.classList.add("bg-image-active") // Disable default animation
      
      // Check if it's a raw URL (http/https or data URI) that needs url() wrapper
      // If the user already typed url(...), it will fall to the else block which is fine.
      if (
        settings.background.match(/^https?:\/\//) ||
        settings.background.startsWith("data:image")
      ) {
        document.body.style.backgroundImage = `url('${settings.background}')`
        document.body.style.backgroundSize = "cover"
        document.body.style.backgroundPosition = "center"
        document.documentElement.style.setProperty("--text-color", '#ffffff');
        // Ensure background-color doesn't override if transparent (though body usually has one)
      } else {
        // Assume it's a color (red, #333, rgb()) or complex background shorthand
        document.body.style.background = settings.background
        document.documentElement.style.setProperty("--text-color", getContrastYIQ(settings.background));
        // Clear specific background-image if switching from image to color
        if (!settings.background.includes("url(")) {
            document.body.style.backgroundImage = ""
        }
      }
    } else {
      // Reset to default CSS
      document.body.style.background = ""
      document.body.style.backgroundImage = ""
      document.body.classList.remove("bg-image-active")
      document.documentElement.style.setProperty("--text-color", '#ffffff');
    }

    // Font
    document.documentElement.style.setProperty("--font-primary", settings.font)

    // Clock Size
    document.documentElement.style.setProperty(
      "--clock-size",
      `${settings.clockSize}rem`
    )

    // Accent Color
    if (settings.accentColor) {
      document.documentElement.style.setProperty(
        "--accent-color",
        settings.accentColor
      )
    }

    // Effect
    if (settings.effect === 'galaxy') {
        starFallEffect.start();
    } else {
        starFallEffect.stop();
    }

    // Gradient
    document.documentElement.style.setProperty("--bg-gradient-start", settings.gradientStart);
    document.documentElement.style.setProperty("--bg-gradient-end", settings.gradientEnd);
    document.documentElement.style.setProperty("--bg-gradient-angle", settings.gradientAngle + 'deg');


    // Update Language UI
    updateLanguage()

    // Update Inputs
    bgInput.value = settings.background
    fontSelect.value = settings.font
    dateFormatSelect.value = settings.dateFormat
    clockSizeInput.value = settings.clockSize
    clockSizeValue.textContent = `${settings.clockSize}rem`
    const languageSelect = document.getElementById("language-select")
    if (languageSelect) languageSelect.value = settings.language || "en"

    const accentInput = document.getElementById("accent-color-picker")
    if (accentInput) accentInput.value = settings.accentColor || "#0f0c29"
    
    effectSelect.value = settings.effect;
    gradientStartPicker.value = settings.gradientStart;
    gradientEndPicker.value = settings.gradientEnd;
    gradientAngleInput.value = settings.gradientAngle;
    gradientAngleValue.textContent = settings.gradientAngle;
  }

  function saveSettings() {
    localStorage.setItem("pageSettings", JSON.stringify(settings))
    applySettings()
  }

  // 3. Bookmarks
  function saveBookmarks() {
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks))
    renderBookmarks()
  }

  function renderBookmarks() {
    bookmarksContainer.innerHTML = ""
    bookmarks.forEach((bookmark, index) => {
      const bookmarkEl = document.createElement("a")
      bookmarkEl.href = bookmark.url
      bookmarkEl.classList.add("bookmark")
      bookmarkEl.target = "_blank"

      let faviconUrl =
        bookmark.icon ||
        `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=128`

      bookmarkEl.innerHTML = `
                <img src="${faviconUrl}" alt="${bookmark.title} icon" onerror="this.src='https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=128'">
                <span>${bookmark.title}</span>
            `

      bookmarkEl.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        contextMenuTargetIndex = index
        showContextMenu(e.clientX, e.clientY)
      })

      bookmarksContainer.appendChild(bookmarkEl)
    })

    // Add New Button
    const addBtn = document.createElement("button")
    addBtn.className = "add-bookmark-card"
    addBtn.setAttribute(
      "aria-label",
      translations[settings.language || "en"].modal_add_title
    )
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>'
    addBtn.addEventListener("click", () => openModal(null))
    bookmarksContainer.appendChild(addBtn)
  }

  // 4. Modal
  function openModal(index = null) {
    modal.classList.add("show")
    editingIndex = index
    const t = translations[settings.language || "en"]

    // Reset View to manual entry by default when opening modal
    importSection.style.display = "none"
    manualEntryForm.style.display = "block"

    if (index !== null) {
      modalTitle.textContent = t.modal_edit_title
      const bookmark = bookmarks[index]
      bookmarkTitleInput.value = bookmark.title
      bookmarkUrlInput.value = bookmark.url
      bookmarkIconInput.value = bookmark.icon || ""
    } else {
      modalTitle.textContent = t.modal_add_title
      bookmarkTitleInput.value = ""
      bookmarkUrlInput.value = ""
      bookmarkIconInput.value = ""
    }

    bookmarkTitleInput.focus()
  }

  function closeModal() {
    modal.classList.remove("show")
    editingIndex = null
  }

  // 5. Context Menu
  function showContextMenu(x, y) {
    contextMenu.style.display = "block"
    contextMenu.style.left = `${x}px`
    contextMenu.style.top = `${y}px`
  }

  function hideContextMenu() {
    contextMenu.style.display = "none"
    contextMenuTargetIndex = -1
  }

  // 6. Import Logic
  function loadBrowserBookmarks() {
    chrome.bookmarks.getTree((tree) => {
      browserBookmarksList.innerHTML = ""
      renderBookmarkTree(tree[0], browserBookmarksList)
    })
  }

  function renderBookmarkTree(node, container) {
    if (node.children) {
      if (node.id !== "0") {
        const folderDiv = document.createElement("div")
        folderDiv.className = "bookmark-tree-folder expanded"
        folderDiv.innerHTML = `<i class="fa-solid fa-chevron-right"></i> <i class="fa-regular fa-folder"></i> <span>${node.title}</span>`

        const childrenContainer = document.createElement("div")
        childrenContainer.className = "folder-content"

        folderDiv.addEventListener("click", () => {
          const isHidden = childrenContainer.classList.contains("hidden")
          if (isHidden) {
            childrenContainer.classList.remove("hidden")
            folderDiv.classList.add("expanded")
            folderDiv.classList.remove("collapsed")
          } else {
            childrenContainer.classList.add("hidden")
            folderDiv.classList.remove("expanded")
            folderDiv.classList.add("collapsed")
          }
        })

        container.appendChild(folderDiv)
        container.appendChild(childrenContainer)
        node.children.forEach((child) =>
          renderBookmarkTree(child, childrenContainer)
        )
      } else {
        node.children.forEach((child) => renderBookmarkTree(child, container))
      }
    } else {
      const itemDiv = document.createElement("div")
      itemDiv.className = "bookmark-tree-item"

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = JSON.stringify({ title: node.title, url: node.url })

      itemDiv.addEventListener("click", (e) => {
        if (e.target !== checkbox) checkbox.checked = !checkbox.checked
      })

      let iconHtml = '<i class="fa-solid fa-earth-americas"></i>'
      if (node.url) {
        iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${node.url}&sz=128" style="width:16px;height:16px;margin-right:5px;">`
      }

      const label = document.createElement("span")
      label.innerHTML = `${iconHtml} ${node.title}`
      label.title = node.url

      itemDiv.appendChild(checkbox)
      itemDiv.appendChild(label)
      container.appendChild(itemDiv)
    }
  }

  // --- Event Listeners ---

  // Search
  searchInput.addEventListener("input", () => {
    clearBtn.style.display = searchInput.value.length > 0 ? "block" : "none"
  })
  clearBtn.addEventListener("click", () => {
    searchInput.value = ""
    searchInput.focus()
    clearBtn.style.display = "none"
  })

  // Bookmarks UI (Modal & Save)
  saveBookmarkBtn.addEventListener("click", () => {
    const title = bookmarkTitleInput.value.trim()
    let url = bookmarkUrlInput.value.trim()
    const icon = bookmarkIconInput.value.trim()
    const t = translations[settings.language || "en"]

    if (title && url) {
      if (!url.startsWith("http://") && !url.startsWith("https://"))
        url = "https://" + url
      const newBookmark = { title, url, icon }

      if (editingIndex !== null) {
        bookmarks[editingIndex] = newBookmark
      } else {
        bookmarks.push(newBookmark)
      }
      saveBookmarks()
      closeModal()
    } else {
      alert(t.alert_missing_fields)
    }
  })

  closeModalBtn.addEventListener("click", closeModal)
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal()
    // hideContextMenu(); // This was causing issues with context menu clicks
  })
  document.addEventListener("click", (e) => {
    // Hide context menu if click is outside of it
    if (
      !contextMenu.contains(e.target) &&
      contextMenu.style.display === "block"
    ) {
      hideContextMenu()
    }
  })

  // Context Menu
  menuEdit.addEventListener("click", (e) => {
    e.stopPropagation() // Prevent document click from immediately hiding it
    if (contextMenuTargetIndex > -1) {
      openModal(contextMenuTargetIndex)
    }
    hideContextMenu()
  })
  menuDelete.addEventListener("click", (e) => {
    e.stopPropagation() // Prevent document click from immediately hiding it
    const t = translations[settings.language || "en"]
    if (
      contextMenuTargetIndex > -1 &&
      confirm(
        `${t.alert_delete_confirm} "${bookmarks[contextMenuTargetIndex].title}"?`
      )
    ) {
      bookmarks.splice(contextMenuTargetIndex, 1)
      saveBookmarks()
    }
    hideContextMenu()
  })

  // Import
  showImportBtn.addEventListener("click", () => {
    const t = translations[settings.language || "en"]
    if (chrome && chrome.bookmarks) {
      manualEntryForm.style.display = "none"
      importSection.style.display = "block"
      modalTitle.textContent = t.modal_import_title
      loadBrowserBookmarks()
    } else {
      alert(t.alert_api_unavailable)
    }
  })

  backToManualBtn.addEventListener("click", () => {
    const t = translations[settings.language || "en"]
    importSection.style.display = "none"
    manualEntryForm.style.display = "block"
    modalTitle.textContent = t.modal_add_title // Reset title
  })

  confirmImportBtn.addEventListener("click", () => {
    const t = translations[settings.language || "en"]
    const checkboxes = browserBookmarksList.querySelectorAll(
      'input[type="checkbox"]:checked'
    )
    let addedCount = 0
    checkboxes.forEach((cb) => {
      const data = JSON.parse(cb.value)
      if (!bookmarks.some((b) => b.url === data.url)) {
        // Check for duplicates
        bookmarks.push({ title: data.title, url: data.url, icon: "" })
        addedCount++
      }
    })

    if (addedCount > 0) {
      saveBookmarks()
      alert(t.alert_imported.replace("{count}", addedCount))
      closeModal()
    } else {
      alert(t.alert_no_selection)
    }
  })

  // Settings Sidebar
  // (Variables already declared at top)

  settingsToggle.addEventListener("click", () =>
    settingsSidebar.classList.add("open")
  )
  closeSettings.addEventListener("click", () =>
    settingsSidebar.classList.remove("open")
  )

  document.addEventListener("click", (e) => {
    if (
      !settingsSidebar.contains(e.target) &&
      !settingsToggle.contains(e.target) &&
      settingsSidebar.classList.contains("open")
    ) {
      settingsSidebar.classList.remove("open")
    }
  })

  languageSelect.addEventListener("change", () => {
    settings.language = languageSelect.value
    saveSettings()
  })

  bgInput.addEventListener("change", () => {
    settings.background = bgInput.value
    saveSettings()
  })
  bgColorPicker.addEventListener("input", () => {
    bgInput.value = bgColorPicker.value // Update text input with color picker value
    settings.background = bgColorPicker.value
    saveSettings()
  })

  if (accentColorPicker) {
    accentColorPicker.addEventListener("input", () => {
      settings.accentColor = accentColorPicker.value
      saveSettings()
    })
  }

  effectSelect.addEventListener("change", () => {
    settings.effect = effectSelect.value
    saveSettings()
  })

  gradientStartPicker.addEventListener("input", () => {
    settings.gradientStart = gradientStartPicker.value
    saveSettings()
  })

  gradientEndPicker.addEventListener("input", () => {
    settings.gradientEnd = gradientEndPicker.value
    saveSettings()
  })

  gradientAngleInput.addEventListener("input", () => {
    settings.gradientAngle = gradientAngleInput.value
    gradientAngleValue.textContent = gradientAngleInput.value
    saveSettings()
  })

  fontSelect.addEventListener("change", () => {
    settings.font = fontSelect.value
    saveSettings()
  })
  dateFormatSelect.addEventListener("change", () => {
    settings.dateFormat = dateFormatSelect.value
    saveSettings()
  })
  clockSizeInput.addEventListener("input", () => {
    settings.clockSize = clockSizeInput.value
    clockSizeValue.textContent = `${settings.clockSize}rem`
    saveSettings()
  })
  resetSettingsBtn.addEventListener("click", () => {
    const t = translations[settings.language || "en"]
    if (confirm(t.alert_reset)) {
      localStorage.removeItem("pageSettings")
      settings = {
        background: "",
        font: "'Outfit', sans-serif",
        dateFormat: "full",
        clockSize: "6",
        language: "en",
        accentColor: "#0f0c29",
        effect: "none",
        gradientStart: "#0f0c29",
        gradientEnd: "#302b63",
        gradientAngle: "135"
      }
      saveSettings() // This will apply default settings
    }
  })

  // --- Initialization ---
  renderBookmarks()
  applySettings()
  setInterval(updateTime, 1000)
})
