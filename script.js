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
  const localBackgroundGallery = document.getElementById(
    "local-background-gallery"
  )
  const localImageUpload = document.getElementById("local-image-upload")
  const uploadLocalImageBtn = document.getElementById("upload-local-image-btn")

  // --- State ---
  let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || []
  let editingIndex = null
  let contextMenuTargetIndex = -1
  let settings = JSON.parse(localStorage.getItem("pageSettings")) || {
    background: "local-bg-5", // Default to a local theme
    font: "'Outfit', sans-serif",
    dateFormat: "full",
    clockSize: "6",
    language: "en",
    accentColor: "#a8c0ff",
    effect: "none",
    gradientStart: "#0f0c29",
    gradientEnd: "#302b63",
    gradientAngle: "135",
    userBackgrounds: [], // to store user-uploaded images
  }

  // Ensure userBackgrounds is always an array, even if loading old settings
  settings.userBackgrounds = settings.userBackgrounds || []

  const localBackgrounds = [
    { id: "local-bg-1", name: "Sunset" },
    { id: "local-bg-2", name: "Lavender" },
    { id: "local-bg-3", name: "Charcoal" },
    { id: "local-bg-4", name: "Morning" },
    { id: "local-bg-5", name: "Deep Space" },
  ]

  // --- Star Fall Effect Class ---
  class StarFall {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId)
      this.ctx = this.canvas.getContext("2d")
      this.stars = []
      this.active = false
      this.animationFrame = null
      this.resize()
      window.addEventListener("resize", () => this.resize())
    }

    resize() {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
    }

    start() {
      if (this.active) return
      this.active = true
      this.createStars()
      this.animate()
      this.canvas.style.display = "block"
    }

    stop() {
      this.active = false
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.canvas.style.display = "none"
      this.stars = []
    }

    createStars() {
      const count = 100
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          length: Math.random() * 20 + 10,
          speed: Math.random() * 5 + 2,
          opacity: Math.random(),
        })
      }
    }

    animate() {
      if (!this.active) return
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
      this.ctx.lineWidth = 1
      this.stars.forEach((star) => {
        this.ctx.beginPath()
        this.ctx.moveTo(star.x, star.y)
        this.ctx.lineTo(star.x, star.y + star.length)
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${star.opacity})`
        this.ctx.stroke()
        star.y += star.speed
        if (star.y > this.canvas.height) {
          star.y = -star.length
          star.x = Math.random() * this.canvas.width
        }
      })
      this.animationFrame = requestAnimationFrame(() => this.animate())
    }
  }

  const starFallEffect = new StarFall("effect-canvas")

  // --- Translations ---
  let i18n = {}

  async function loadLanguage(lang) {
    const language = lang || settings.language || "en"
    try {
      const response = await fetch(`./locales/${language}.json`)
      if (!response.ok) throw new Error("File not found")
      i18n = await response.json()
    } catch (e) {
      console.error(
        `Could not load ${language}.json, falling back to English.`,
        e
      )
      if (language !== "en") {
        const response = await fetch(`./locales/en.json`)
        i18n = await response.json()
        settings.language = "en"
      }
    }
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n")
      if (i18n[key]) el.textContent = i18n[key]
    })
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder")
      if (i18n[key]) el.placeholder = i18n[key]
    })
    updateTime()
  }

  // --- Functions ---

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
      dateString = now.toLocaleDateString(langCode, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    } else if (format === "short") {
      dateString = now.toLocaleDateString("en-GB")
    } else if (format === "us") {
      dateString = now.toLocaleDateString("en-US")
    } else if (format === "iso") {
      dateString = now.toISOString().split("T")[0]
    }
    dateElement.textContent = dateString
  }

  function getContrastYIQ(hexcolor) {
    if (!hexcolor) return "white"
    var colours = {
      aliceblue: "#f0f8ff",
      antiquewhite: "#faebd7",
      aqua: "#00ffff",
      aquamarine: "#7fffd4",
      azure: "#f0ffff",
      beige: "#f5f5dc",
      bisque: "#ffe4c4",
      black: "#000000",
      blanchedalmond: "#ffebcd",
      blue: "#0000ff",
      blueviolet: "#8a2be2",
      brown: "#a52a2a",
      burlywood: "#deb887",
      cadetblue: "#5f9ea0",
      chartreuse: "#7fff00",
      chocolate: "#d2691e",
      coral: "#ff7f50",
      cornflowerblue: "#6495ed",
      cornsilk: "#fff8dc",
      crimson: "#dc143c",
      cyan: "#00ffff",
      darkblue: "#00008b",
      darkcyan: "#008b8b",
      darkgoldenrod: "#b8860b",
      darkgray: "#a9a9a9",
      darkgreen: "#006400",
      darkkhaki: "#bdb76b",
      darkmagenta: "#8b008b",
      darkolivegreen: "#556b2f",
      darkorange: "#ff8c00",
      darkorchid: "#9932cc",
      darkred: "#8b0000",
      darksalmon: "#e9967a",
      darkseagreen: "#8fbc8f",
      darkslateblue: "#483d8b",
      darkslategray: "#2f4f4f",
      darkturquoise: "#00ced1",
      darkviolet: "#9400d3",
      deeppink: "#ff1493",
      deepskyblue: "#00bfff",
      dimgray: "#696969",
      dodgerblue: "#1e90ff",
      firebrick: "#b22222",
      floralwhite: "#fffaf0",
      forestgreen: "#228b22",
      fuchsia: "#ff00ff",
      gainsboro: "#dcdcdc",
      ghostwhite: "#f8f8ff",
      gold: "#ffd700",
      goldenrod: "#daa520",
      gray: "#808080",
      green: "#008000",
      greenyellow: "#adff2f",
      honeydew: "#f0fff0",
      hotpink: "#ff69b4",
      "indianred ": "#cd5c5c",
      indigo: "#4b0082",
      ivory: "#fffff0",
      khaki: "#f0e68c",
      lavender: "#e6e6fa",
      lavenderblush: "#fff0f5",
      lawngreen: "#7cfc00",
      lemonchiffon: "#fffacd",
      lightblue: "#add8e6",
      lightcoral: "#f08080",
      lightcyan: "#e0ffff",
      lightgoldenrodyellow: "#fafad2",
      lightgrey: "#d3d3d3",
      lightgreen: "#90ee90",
      lightpink: "#ffb6c1",
      lightsalmon: "#ffa07a",
      lightseagreen: "#20b2aa",
      lightskyblue: "#87cefa",
      lightslategray: "#778899",
      lightsteelblue: "#b0c4de",
      lightyellow: "#ffffe0",
      lime: "#00ff00",
      limegreen: "#32cd32",
      linen: "#faf0e6",
      magenta: "#ff00ff",
      maroon: "#800000",
      mediumaquamarine: "#66cdaa",
      mediumblue: "#0000cd",
      mediumorchid: "#ba55d3",
      mediumpurple: "#9370d8",
      mediumseagreen: "#3cb371",
      mediumslateblue: "#7b68ee",
      mediumspringgreen: "#00fa9a",
      mediumturquoise: "#48d1cc",
      mediumvioletred: "#c71585",
      midnightblue: "#191970",
      mintcream: "#f5fffa",
      mistyrose: "#ffe4e1",
      moccasin: "#ffe4b5",
      navajowhite: "#ffdead",
      navy: "#000080",
      oldlace: "#fdf5e6",
      olive: "#808000",
      olivedrab: "#6b8e23",
      orange: "#ffa500",
      orangered: "#ff4500",
      orchid: "#da70d6",
      palegoldenrod: "#eee8aa",
      palegreen: "#98fb98",
      paleturquoise: "#afeeee",
      palevioletred: "#d87093",
      papayawhip: "#ffefd5",
      peachpuff: "#ffdab9",
      peru: "#cd853f",
      pink: "#ffc0cb",
      plum: "#dda0dd",
      powderblue: "#b0e0e6",
      purple: "#800080",
      rebeccapurple: "#663399",
      red: "#ff0000",
      rosybrown: "#bc8f8f",
      royalblue: "#4169e1",
      saddlebrown: "#8b4513",
      salmon: "#fa8072",
      sandybrown: "#f4a460",
      seagreen: "#2e8b57",
      seashell: "#fff5ee",
      sienna: "#a0522d",
      silver: "#c0c0c0",
      skyblue: "#87ceeb",
      slateblue: "#6a5acd",
      slategray: "#708090",
      snow: "#fffafa",
      springgreen: "#00ff7f",
      steelblue: "#4682b4",
      tan: "#d2b48c",
      teal: "#008080",
      thistle: "#d8bfd8",
      tomato: "#ff6347",
      turquoise: "#40e0d0",
      violet: "#ee82ee",
      wheat: "#f5deb3",
      white: "#ffffff",
      whitesmoke: "#f5f5f5",
      yellow: "#ffff00",
      yellowgreen: "#9acd32",
    }
    hexcolor = (colours[hexcolor.toLowerCase()] || hexcolor).replace("#", "")
    var r = parseInt(hexcolor.substr(0, 2), 16)
    var g = parseInt(hexcolor.substr(2, 2), 16)
    var b = parseInt(hexcolor.substr(4, 2), 16)
    var yiq = (r * 299 + g * 587 + b * 114) / 1000
    return yiq >= 128 ? "black" : "white"
  }

  function applySettings() {
    // Reset body classes and inline styles
    document.body.className = ""
    document.body.style.background = ""
    document.body.style.backgroundImage = ""
    document.documentElement.style.setProperty("--text-color", "#ffffff")

    // Background
    const bg = settings.background
    const isPredefinedLocalBg = localBackgrounds.some((b) => b.id === bg)
    const isUserUploadedBg = bg && bg.startsWith("data:image") // Check if it's a data URL

    if (isPredefinedLocalBg) {
      document.body.classList.add(bg)
      document.documentElement.style.setProperty("--text-color", "#ffffff") // Assume local themes are dark
    } else if (isUserUploadedBg) {
      document.body.classList.add("bg-image-active")
      document.body.style.backgroundImage = `url('${bg}')`
      document.body.style.backgroundSize = "cover"
      document.body.style.backgroundPosition = "center"
      document.documentElement.style.setProperty("--text-color", "#ffffff") // Assuming user images are often dark, or at least setting a default readable color
    } else if (bg) {
      // This covers URL or Solid Color input
      document.body.classList.add("bg-image-active")
      if (bg.match(/^https?:\/\//)) {
        // Remote URL
        document.body.style.backgroundImage = `url('${bg}')`
        document.body.style.backgroundSize = "cover"
        document.body.style.backgroundPosition = "center"
      } else {
        // Solid Color
        document.body.style.background = bg
        document.documentElement.style.setProperty(
          "--text-color",
          getContrastYIQ(bg)
        )
      }
    } else {
      document.body.style.background = "" // Default gradient, or no background set
    }

    // Font, Clock Size, Accent Color
    document.documentElement.style.setProperty("--font-primary", settings.font)
    document.documentElement.style.setProperty(
      "--clock-size",
      `${settings.clockSize}rem`
    )
    if (settings.accentColor) {
      document.documentElement.style.setProperty(
        "--accent-color",
        settings.accentColor
      )
    }

    // Effect
    if (settings.effect === "galaxy") starFallEffect.start()
    else starFallEffect.stop()

    // Gradient (for default view)
    document.documentElement.style.setProperty(
      "--bg-gradient-start",
      settings.gradientStart
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-end",
      settings.gradientEnd
    )
    document.documentElement.style.setProperty(
      "--bg-gradient-angle",
      settings.gradientAngle + "deg"
    )

    // Update Language & Inputs
    applyTranslations()
    updateSettingsInputs()
  }

  function updateSettingsInputs() {
    const isPredefinedLocalBg = localBackgrounds.some(
      (b) => b.id === settings.background
    )
    const isUserUploadedBg =
      settings.background && settings.background.startsWith("data:image")
    bgInput.value =
      isPredefinedLocalBg || isUserUploadedBg ? "" : settings.background
    fontSelect.value = settings.font
    dateFormatSelect.value = settings.dateFormat
    clockSizeInput.value = settings.clockSize
    clockSizeValue.textContent = `${settings.clockSize}rem`
    if (languageSelect) languageSelect.value = settings.language || "en"
    if (accentColorPicker)
      accentColorPicker.value = settings.accentColor || "#a8c0ff"
    effectSelect.value = settings.effect
    gradientStartPicker.value = settings.gradientStart
    gradientEndPicker.value = settings.gradientEnd
    gradientAngleInput.value = settings.gradientAngle
    gradientAngleValue.textContent = settings.gradientAngle

    // Update local background gallery active state
    document.querySelectorAll(".local-bg-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.bgId === settings.background)
    })
  }

  function saveSettings() {
    localStorage.setItem("pageSettings", JSON.stringify(settings))
    applySettings()
  }

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
      bookmarkEl.innerHTML = `<img src="${faviconUrl}" alt="${bookmark.title} icon" onerror="this.src='https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=128'"><span>${bookmark.title}</span>`
      bookmarkEl.addEventListener("contextmenu", (e) => {
        e.preventDefault()
        contextMenuTargetIndex = index
        showContextMenu(e.clientX, e.clientY)
      })
      bookmarksContainer.appendChild(bookmarkEl)
    })

    const addBtn = document.createElement("button")
    addBtn.className = "add-bookmark-card"
    addBtn.setAttribute("aria-label", i18n.modal_add_title || "Add Bookmark")
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>'
    addBtn.addEventListener("click", () => openModal(null))
    bookmarksContainer.appendChild(addBtn)
  }

  function renderLocalBackgrounds() {
    localBackgroundGallery.innerHTML = "" // Changed to localBackgroundGallery
    // Render predefined backgrounds
    localBackgrounds.forEach((bg) => {
      const item = document.createElement("div")
      item.className = `local-bg-item ${bg.id}`
      item.dataset.bgId = bg.id
      item.title = bg.name
      localBackgroundGallery.appendChild(item)
    })

    // Render user-uploaded backgrounds
    if (Array.isArray(settings.userBackgrounds)) {
      settings.userBackgrounds.forEach((bgUrl, index) => {
        const item = document.createElement("div")
        item.className = "local-bg-item user-uploaded"
        item.dataset.bgId = bgUrl // Using data URL as ID
        item.style.backgroundImage = `url('${bgUrl}')`
        item.title = `User Image ${index + 1}`

        const removeBtn = document.createElement("button")
        removeBtn.className = "remove-bg-btn"
        removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation() // Prevent selecting the background when removing
          if (
            confirm(
              i18n.alert_delete_bg_confirm ||
                "Are you sure you want to remove this background?"
            )
          ) {
            // New i18n key
            settings.userBackgrounds.splice(index, 1)
            // If the removed background was active, revert to default
            if (settings.background === bgUrl) {
              settings.background = "local-bg-5" // Default background
            }
            saveSettings()
          }
        })
        item.appendChild(removeBtn)
        localBackgroundGallery.appendChild(item)
      })
    }
  }

  function openModal(index = null) {
    modal.classList.add("show")
    editingIndex = index
    importSection.style.display = "none"
    manualEntryForm.style.display = "block"
    if (index !== null) {
      modalTitle.textContent = i18n.modal_edit_title
      const bookmark = bookmarks[index]
      bookmarkTitleInput.value = bookmark.title
      bookmarkUrlInput.value = bookmark.url
      bookmarkIconInput.value = bookmark.icon || ""
    } else {
      modalTitle.textContent = i18n.modal_add_title
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

  function showContextMenu(x, y) {
    contextMenu.style.display = "block"
    contextMenu.style.left = `${x}px`
    contextMenu.style.top = `${y}px`
  }

  function hideContextMenu() {
    contextMenu.style.display = "none"
    contextMenuTargetIndex = -1
  }

  function loadBrowserBookmarks() {
    if (!chrome || !chrome.bookmarks) return
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
        folderDiv.addEventListener("click", () =>
          folderDiv.parentElement.classList.toggle("collapsed")
        )
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
      let iconHtml = node.url
        ? `<img src="https://www.google.com/s2/favicons?domain=${node.url}&sz=128" style="width:16px;height:16px;margin-right:5px;">`
        : '<i class="fa-solid fa-earth-americas"></i>'
      const label = document.createElement("span")
      label.innerHTML = `${iconHtml} ${node.title}`
      label.title = node.url
      itemDiv.appendChild(checkbox)
      itemDiv.appendChild(label)
      container.appendChild(itemDiv)
    }
  }

  // --- Event Listeners ---

  searchInput.addEventListener("input", () => {
    clearBtn.style.display = searchInput.value.length > 0 ? "block" : "none"
  })
  clearBtn.addEventListener("click", () => {
    searchInput.value = ""
    searchInput.focus()
    clearBtn.style.display = "none"
  })

  saveBookmarkBtn.addEventListener("click", () => {
    const title = bookmarkTitleInput.value.trim()
    let url = bookmarkUrlInput.value.trim()
    const icon = bookmarkIconInput.value.trim()
    if (title && url) {
      if (!url.match(/^https?:\/\//)) url = "https://" + url
      const newBookmark = { title, url, icon }
      if (editingIndex !== null) bookmarks[editingIndex] = newBookmark
      else bookmarks.push(newBookmark)
      saveBookmarks()
      closeModal()
    } else {
      alert(i18n.alert_missing_fields)
    }
  })

  closeModalBtn.addEventListener("click", closeModal)
  window.addEventListener("click", (e) => {
    if (e.target === modal) closeModal()
    if (!contextMenu.contains(e.target)) hideContextMenu()
  })

  menuEdit.addEventListener("click", (e) => {
    e.stopPropagation()
    if (contextMenuTargetIndex > -1) openModal(contextMenuTargetIndex)
    hideContextMenu()
  })
  menuDelete.addEventListener("click", (e) => {
    e.stopPropagation()
    if (
      contextMenuTargetIndex > -1 &&
      confirm(
        `${i18n.alert_delete_confirm} "${bookmarks[contextMenuTargetIndex].title}"?`
      )
    ) {
      bookmarks.splice(contextMenuTargetIndex, 1)
      saveBookmarks()
    }
    hideContextMenu()
  })

  showImportBtn.addEventListener("click", () => {
    if (chrome && chrome.bookmarks) {
      manualEntryForm.style.display = "none"
      importSection.style.display = "block"
      modalTitle.textContent = i18n.modal_import_title
      loadBrowserBookmarks()
    } else {
      alert(i18n.alert_api_unavailable)
    }
  })

  backToManualBtn.addEventListener("click", () => {
    importSection.style.display = "none"
    manualEntryForm.style.display = "block"
    modalTitle.textContent = i18n.modal_add_title
  })

  confirmImportBtn.addEventListener("click", () => {
    const checkboxes = browserBookmarksList.querySelectorAll(
      'input[type="checkbox"]:checked'
    )
    let addedCount = 0
    checkboxes.forEach((cb) => {
      const data = JSON.parse(cb.value)
      if (!bookmarks.some((b) => b.url === data.url)) {
        bookmarks.push({ title: data.title, url: data.url, icon: "" })
        addedCount++
      }
    })
    if (addedCount > 0) {
      saveBookmarks()
      alert(i18n.alert_imported.replace("{count}", addedCount))
      closeModal()
    } else {
      alert(i18n.alert_no_selection)
    }
  })

  settingsToggle.addEventListener("click", () =>
    settingsSidebar.classList.add("open")
  )
  closeSettings.addEventListener("click", () =>
    settingsSidebar.classList.remove("open")
  )
  document.addEventListener("click", (e) => {
    if (
      !settingsSidebar.contains(e.target) &&
      !settingsToggle.contains(e.target)
    ) {
      settingsSidebar.classList.remove("open")
    }
  })

  document.querySelectorAll(".section-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      toggle.parentElement.classList.toggle("collapsed")
    })
  })

  languageSelect.addEventListener("change", async () => {
    settings.language = languageSelect.value
    await loadLanguage(settings.language)
    saveSettings()
  })

  bgInput.addEventListener("change", () => {
    settings.background = bgInput.value.trim()
    saveSettings()
  })
  bgColorPicker.addEventListener("input", () => {
    bgInput.value = bgColorPicker.value
    settings.background = bgColorPicker.value
    saveSettings()
  })

  uploadLocalImageBtn.addEventListener("click", () => {
    localImageUpload.click() // Trigger hidden file input
  })

  localImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target.result
        settings.userBackgrounds.push(dataUrl)
        settings.background = dataUrl // Set newly uploaded as current background
        saveSettings()
      }
      reader.readAsDataURL(file)
    }
    e.target.value = null // Clear the input so same file can be uploaded again
  })

  localBackgroundGallery.addEventListener("click", (e) => {
    // Changed to localBackgroundGallery
    // Handle predefined and user-uploaded background selection
    if (e.target.classList.contains("local-bg-item")) {
      settings.background = e.target.dataset.bgId
      saveSettings()
    }
    // Remove button handled within renderLocalBackgrounds
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
    if (confirm(i18n.alert_reset)) {
      localStorage.removeItem("pageSettings")
      settings = {
        background: "local-bg-5",
        font: "'Outfit', sans-serif",
        dateFormat: "full",
        clockSize: "6",
        language: "en",
        accentColor: "#a8c0ff",
        effect: "none",
        gradientStart: "#0f0c29",
        gradientEnd: "#302b63",
        gradientAngle: "135",
        userBackgrounds: [], // Clear user-uploaded backgrounds on reset
      }
      saveSettings()
    }
  })

  // --- Initialization ---
  async function init() {
    await loadLanguage(settings.language)

    // Debug checks before function calls
    console.log("--- Init Debug ---")
    console.log("typeof renderBookmarks:", typeof renderBookmarks)
    console.log("typeof renderLocalBackgrounds:", typeof renderLocalBackgrounds)
    console.log("typeof applySettings:", typeof applySettings)
    console.log("typeof getContrastYIQ:", typeof getContrastYIQ)
    console.log("typeof localBackgrounds:", typeof localBackgrounds)
    console.log("--- End Init Debug ---")

    if (typeof renderBookmarks === "function") renderBookmarks()
    else console.error("renderBookmarks is not a function!")
    if (typeof renderLocalBackgrounds === "function") renderLocalBackgrounds()
    else console.error("renderLocalBackgrounds is not a function!")
    if (typeof applySettings === "function") applySettings()
    else console.error("applySettings is not a function!")

    // Set initial state for collapsible sections
    document.querySelectorAll(".settings-section").forEach((section) => {
      section.classList.add("collapsed")
    })

    setInterval(updateTime, 1000)
  }

  init()
})
