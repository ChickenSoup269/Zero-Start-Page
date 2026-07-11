/**
 * Font Awesome Icon Picker
 * Provides a searchable, categorized grid of FA icons for tab icon selection.
 * Uses Free FA icons (solid, regular, brands).
 */

// A curated list of common free FA icons [prefix, name, label]
// prefix: "fas" = solid, "far" = regular, "fab" = brands
const FA_ICONS = [
  // === Solid ===
  ["fas", "fa-house", "house"],
  ["fas", "fa-star", "star"],
  ["fas", "fa-heart", "heart"],
  ["fas", "fa-bolt", "bolt"],
  ["fas", "fa-fire", "fire"],
  ["fas", "fa-rocket", "rocket"],
  ["fas", "fa-globe", "globe"],
  ["fas", "fa-earth-americas", "earth"],
  ["fas", "fa-map-location-dot", "map"],
  ["fas", "fa-magnifying-glass", "search"],
  ["fas", "fa-bookmark", "bookmark"],
  ["fas", "fa-bell", "bell"],
  ["fas", "fa-gear", "gear"],
  ["fas", "fa-sliders", "sliders"],
  ["fas", "fa-toggle-on", "toggle"],
  ["fas", "fa-palette", "palette"],
  ["fas", "fa-paintbrush", "paintbrush"],
  ["fas", "fa-pen", "pen"],
  ["fas", "fa-pencil", "pencil"],
  ["fas", "fa-pen-nib", "pen nib"],
  ["fas", "fa-wand-magic-sparkles", "magic"],
  ["fas", "fa-sparkles", "sparkles"],
  ["fas", "fa-gem", "gem"],
  ["fas", "fa-crown", "crown"],
  ["fas", "fa-trophy", "trophy"],
  ["fas", "fa-medal", "medal"],
  ["fas", "fa-certificate", "certificate"],
  ["fas", "fa-shield-halved", "shield"],
  ["fas", "fa-lock", "lock"],
  ["fas", "fa-unlock", "unlock"],
  ["fas", "fa-key", "key"],
  ["fas", "fa-user", "user"],
  ["fas", "fa-user-astronaut", "astronaut"],
  ["fas", "fa-robot", "robot"],
  ["fas", "fa-ghost", "ghost"],
  ["fas", "fa-dragon", "dragon"],
  ["fas", "fa-cat", "cat"],
  ["fas", "fa-dog", "dog"],
  ["fas", "fa-dove", "dove"],
  ["fas", "fa-fish", "fish"],
  ["fas", "fa-tree", "tree"],
  ["fas", "fa-leaf", "leaf"],
  ["fas", "fa-seedling", "seedling"],
  ["fas", "fa-sun", "sun"],
  ["fas", "fa-moon", "moon"],
  ["fas", "fa-cloud", "cloud"],
  ["fas", "fa-snowflake", "snowflake"],
  ["fas", "fa-rainbow", "rainbow"],
  ["fas", "fa-wind", "wind"],
  ["fas", "fa-water", "water"],
  ["fas", "fa-mountain", "mountain"],
  ["fas", "fa-volcano", "volcano"],
  ["fas", "fa-meteor", "meteor"],
  ["fas", "fa-comet", "comet"],
  ["fas", "fa-atom", "atom"],
  ["fas", "fa-dna", "dna"],
  ["fas", "fa-flask", "flask"],
  ["fas", "fa-microscope", "microscope"],
  ["fas", "fa-brain", "brain"],
  ["fas", "fa-eye", "eye"],
  ["fas", "fa-hand-sparkles", "hand sparkles"],
  ["fas", "fa-fingerprint", "fingerprint"],
  ["fas", "fa-infinity", "infinity"],
  ["fas", "fa-yin-yang", "yin yang"],
  ["fas", "fa-peace", "peace"],
  ["fas", "fa-ankh", "ankh"],
  ["fas", "fa-om", "om"],
  ["fas", "fa-music", "music"],
  ["fas", "fa-headphones", "headphones"],
  ["fas", "fa-microphone", "microphone"],
  ["fas", "fa-guitar", "guitar"],
  ["fas", "fa-drum", "drum"],
  ["fas", "fa-film", "film"],
  ["fas", "fa-camera", "camera"],
  ["fas", "fa-photo-film", "photo film"],
  ["fas", "fa-tv", "tv"],
  ["fas", "fa-gamepad", "gamepad"],
  ["fas", "fa-dice", "dice"],
  ["fas", "fa-chess", "chess"],
  ["fas", "fa-puzzle-piece", "puzzle"],
  ["fas", "fa-book", "book"],
  ["fas", "fa-book-open", "book open"],
  ["fas", "fa-graduation-cap", "graduation"],
  ["fas", "fa-school", "school"],
  ["fas", "fa-flask-vial", "flask vial"],
  ["fas", "fa-laptop", "laptop"],
  ["fas", "fa-desktop", "desktop"],
  ["fas", "fa-mobile-screen", "mobile"],
  ["fas", "fa-tablet-screen-button", "tablet"],
  ["fas", "fa-keyboard", "keyboard"],
  ["fas", "fa-computer-mouse", "mouse"],
  ["fas", "fa-server", "server"],
  ["fas", "fa-database", "database"],
  ["fas", "fa-hard-drive", "hard drive"],
  ["fas", "fa-memory", "memory"],
  ["fas", "fa-microchip", "microchip"],
  ["fas", "fa-wifi", "wifi"],
  ["fas", "fa-satellite-dish", "satellite"],
  ["fas", "fa-tower-broadcast", "broadcast"],
  ["fas", "fa-code", "code"],
  ["fas", "fa-terminal", "terminal"],
  ["fas", "fa-bug", "bug"],
  ["fas", "fa-code-branch", "branch"],
  ["fas", "fa-cloud-upload-alt", "upload"],
  ["fas", "fa-cloud-download-alt", "download"],
  ["fas", "fa-folder", "folder"],
  ["fas", "fa-file", "file"],
  ["fas", "fa-file-code", "file code"],
  ["fas", "fa-envelope", "envelope"],
  ["fas", "fa-paper-plane", "paper plane"],
  ["fas", "fa-comment", "comment"],
  ["fas", "fa-comments", "comments"],
  ["fas", "fa-message", "message"],
  ["fas", "fa-phone", "phone"],
  ["fas", "fa-video", "video"],
  ["fas", "fa-map-pin", "map pin"],
  ["fas", "fa-location-dot", "location"],
  ["fas", "fa-compass", "compass"],
  ["fas", "fa-route", "route"],
  ["fas", "fa-car", "car"],
  ["fas", "fa-bicycle", "bicycle"],
  ["fas", "fa-plane", "plane"],
  ["fas", "fa-ship", "ship"],
  ["fas", "fa-train", "train"],
  ["fas", "fa-bus", "bus"],
  ["fas", "fa-motorcycle", "motorcycle"],
  ["fas", "fa-truck", "truck"],
  ["fas", "fa-shop", "shop"],
  ["fas", "fa-store", "store"],
  ["fas", "fa-building", "building"],
  ["fas", "fa-city", "city"],
  ["fas", "fa-hospital", "hospital"],
  ["fas", "fa-utensils", "utensils"],
  ["fas", "fa-mug-hot", "mug"],
  ["fas", "fa-pizza-slice", "pizza"],
  ["fas", "fa-burger", "burger"],
  ["fas", "fa-cake-candles", "cake"],
  ["fas", "fa-wine-glass", "wine"],
  ["fas", "fa-martini-glass-citrus", "cocktail"],
  ["fas", "fa-dumbbell", "dumbbell"],
  ["fas", "fa-person-running", "running"],
  ["fas", "fa-futbol", "soccer"],
  ["fas", "fa-basketball", "basketball"],
  ["fas", "fa-baseball", "baseball"],
  ["fas", "fa-football", "football"],
  ["fas", "fa-volleyball", "volleyball"],
  ["fas", "fa-table-tennis-paddle-ball", "table tennis"],
  ["fas", "fa-golf-ball-tee", "golf"],
  ["fas", "fa-swimmer", "swimmer"],
  ["fas", "fa-person-skiing", "skiing"],
  ["fas", "fa-chess-king", "chess king"],
  ["fas", "fa-dice-d20", "d20"],
  ["fas", "fa-hat-wizard", "wizard"],
  ["fas", "fa-skull", "skull"],
  ["fas", "fa-skull-crossbones", "skull crossbones"],
  ["fas", "fa-syringe", "syringe"],
  ["fas", "fa-pills", "pills"],
  ["fas", "fa-stethoscope", "stethoscope"],
  ["fas", "fa-heartbeat", "heartbeat"],
  ["fas", "fa-wheelchair", "wheelchair"],
  ["fas", "fa-baby", "baby"],
  ["fas", "fa-person", "person"],
  ["fas", "fa-people-group", "people group"],
  ["fas", "fa-handshake", "handshake"],
  ["fas", "fa-hands-helping", "helping"],
  ["fas", "fa-flag", "flag"],
  ["fas", "fa-xmark", "xmark"],
  ["fas", "fa-check", "check"],
  ["fas", "fa-plus", "plus"],
  ["fas", "fa-minus", "minus"],
  ["fas", "fa-arrow-up", "arrow up"],
  ["fas", "fa-arrow-right", "arrow right"],
  ["fas", "fa-rotate", "rotate"],
  ["fas", "fa-power-off", "power"],
  ["fas", "fa-circle-half-stroke", "half stroke"],
  ["fas", "fa-circle-dot", "circle dot"],
  ["fas", "fa-asterisk", "asterisk"],
  ["fas", "fa-hashtag", "hashtag"],
  ["fas", "fa-at", "at"],
  ["fas", "fa-percent", "percent"],
  ["fas", "fa-euro-sign", "euro"],
  ["fas", "fa-dollar-sign", "dollar"],
  ["fas", "fa-bitcoin-sign", "bitcoin"],
  ["fas", "fa-wallet", "wallet"],
  ["fas", "fa-credit-card", "credit card"],
  ["fas", "fa-cart-shopping", "cart"],
  ["fas", "fa-tag", "tag"],
  ["fas", "fa-tags", "tags"],
  ["fas", "fa-gift", "gift"],
  ["fas", "fa-box", "box"],
  ["fas", "fa-cubes", "cubes"],
  ["fas", "fa-layer-group", "layers"],
  ["fas", "fa-shapes", "shapes"],
  ["fas", "fa-square", "square"],
  ["fas", "fa-circle", "circle"],
  ["fas", "fa-triangle-exclamation", "warning"],
  ["fas", "fa-circle-exclamation", "exclamation"],
  ["fas", "fa-circle-info", "info"],
  ["fas", "fa-circle-question", "question"],
  ["fas", "fa-ban", "ban"],
  ["fas", "fa-trash", "trash"],
  ["fas", "fa-recycle", "recycle"],
  ["fas", "fa-link", "link"],
  ["fas", "fa-share-nodes", "share"],
  ["fas", "fa-rss", "rss"],
  ["fas", "fa-qrcode", "qrcode"],
  ["fas", "fa-barcode", "barcode"],
  ["fas", "fa-print", "print"],
  ["fas", "fa-scissors", "scissors"],
  ["fas", "fa-copy", "copy"],
  ["fas", "fa-paste", "paste"],
  ["fas", "fa-clock", "clock"],
  ["fas", "fa-calendar", "calendar"],
  ["fas", "fa-calendar-days", "calendar days"],
  ["fas", "fa-hourglass-half", "hourglass"],
  ["fas", "fa-stopwatch", "stopwatch"],
  ["fas", "fa-bell-slash", "bell slash"],
  ["fas", "fa-volume-high", "volume"],
  ["fas", "fa-volume-xmark", "mute"],
  ["fas", "fa-play", "play"],
  ["fas", "fa-pause", "pause"],
  ["fas", "fa-stop", "stop"],
  ["fas", "fa-forward", "forward"],
  ["fas", "fa-backward", "backward"],
  ["fas", "fa-shuffle", "shuffle"],
  ["fas", "fa-repeat", "repeat"],
  // === Regular ===
  ["far", "fa-star", "star (reg)"],
  ["far", "fa-heart", "heart (reg)"],
  ["far", "fa-bookmark", "bookmark (reg)"],
  ["far", "fa-bell", "bell (reg)"],
  ["far", "fa-eye", "eye (reg)"],
  ["far", "fa-comment", "comment (reg)"],
  ["far", "fa-envelope", "envelope (reg)"],
  ["far", "fa-calendar", "calendar (reg)"],
  ["far", "fa-clock", "clock (reg)"],
  ["far", "fa-folder", "folder (reg)"],
  ["far", "fa-file", "file (reg)"],
  ["far", "fa-circle", "circle (reg)"],
  ["far", "fa-square", "square (reg)"],
  ["far", "fa-face-smile", "smile"],
  ["far", "fa-face-grin-stars", "grin stars"],
  ["far", "fa-face-sad-tear", "sad"],
  ["far", "fa-face-angry", "angry"],
  ["far", "fa-face-surprise", "surprise"],
  ["far", "fa-thumbs-up", "thumbs up"],
  ["far", "fa-thumbs-down", "thumbs down"],
  ["far", "fa-hand-pointer", "pointer"],
  ["far", "fa-user", "user (reg)"],
  ["far", "fa-moon", "moon (reg)"],
  ["far", "fa-sun", "sun (reg)"],
  ["far", "fa-snowflake", "snowflake (reg)"],
  ["far", "fa-lightbulb", "lightbulb"],
  ["far", "fa-image", "image"],
  ["far", "fa-copy", "copy (reg)"],
  ["far", "fa-trash-can", "trash can"],
  ["far", "fa-pen-to-square", "edit"],
  ["far", "fa-message", "message (reg)"],
  ["far", "fa-paper-plane", "paper plane (reg)"],
  // === Brands ===
  ["fab", "fa-github", "GitHub"],
  ["fab", "fa-gitlab", "GitLab"],
  ["fab", "fa-bitbucket", "Bitbucket"],
  ["fab", "fa-google", "Google"],
  ["fab", "fa-youtube", "YouTube"],
  ["fab", "fa-spotify", "Spotify"],
  ["fab", "fa-twitter", "Twitter/X"],
  ["fab", "fa-x-twitter", "X"],
  ["fab", "fa-facebook", "Facebook"],
  ["fab", "fa-instagram", "Instagram"],
  ["fab", "fa-tiktok", "TikTok"],
  ["fab", "fa-reddit", "Reddit"],
  ["fab", "fa-discord", "Discord"],
  ["fab", "fa-slack", "Slack"],
  ["fab", "fa-telegram", "Telegram"],
  ["fab", "fa-whatsapp", "WhatsApp"],
  ["fab", "fa-linkedin", "LinkedIn"],
  ["fab", "fa-pinterest", "Pinterest"],
  ["fab", "fa-twitch", "Twitch"],
  ["fab", "fa-steam", "Steam"],
  ["fab", "fa-playstation", "PlayStation"],
  ["fab", "fa-xbox", "Xbox"],
  ["fab", "fa-nintendo-switch", "Switch"],
  ["fab", "fa-apple", "Apple"],
  ["fab", "fa-windows", "Windows"],
  ["fab", "fa-linux", "Linux"],
  ["fab", "fa-android", "Android"],
  ["fab", "fa-chrome", "Chrome"],
  ["fab", "fa-firefox-browser", "Firefox"],
  ["fab", "fa-safari", "Safari"],
  ["fab", "fa-edge", "Edge"],
  ["fab", "fa-opera", "Opera"],
  ["fab", "fa-react", "React"],
  ["fab", "fa-vuejs", "Vue"],
  ["fab", "fa-angular", "Angular"],
  ["fab", "fa-node-js", "Node.js"],
  ["fab", "fa-python", "Python"],
  ["fab", "fa-js", "JavaScript"],
  ["fab", "fa-html5", "HTML5"],
  ["fab", "fa-css3-alt", "CSS3"],
  ["fab", "fa-php", "PHP"],
  ["fab", "fa-java", "Java"],
  ["fab", "fa-rust", "Rust"],
  ["fab", "fa-docker", "Docker"],
  ["fab", "fa-aws", "AWS"],
  ["fab", "fa-google-drive", "Drive"],
  ["fab", "fa-dropbox", "Dropbox"],
  ["fab", "fa-notion", "Notion"],
  ["fab", "fa-figma", "Figma"],
  ["fab", "fa-trello", "Trello"],
  ["fab", "fa-npm", "npm"],
  ["fab", "fa-yarn", "Yarn"],
  ["fab", "fa-git-alt", "Git"],
  ["fab", "fa-bootstrap", "Bootstrap"],
  ["fab", "fa-sass", "Sass"],
  ["fab", "fa-stripe", "Stripe"],
  ["fab", "fa-paypal", "PayPal"],
  ["fab", "fa-cc-visa", "Visa"],
  ["fab", "fa-cc-mastercard", "Mastercard"],
  ["fab", "fa-bitcoin", "Bitcoin"],
  ["fab", "fa-ethereum", "Ethereum"],
  ["fab", "fa-unsplash", "Unsplash"],
  ["fab", "fa-medium", "Medium"],
  ["fab", "fa-dev", "Dev.to"],
  ["fab", "fa-stack-overflow", "Stack Overflow"],
  ["fab", "fa-wikipedia-w", "Wikipedia"],
  ["fab", "fa-soundcloud", "SoundCloud"],
  ["fab", "fa-bandcamp", "Bandcamp"],
  ["fab", "fa-lastfm", "Last.fm"],
  ["fab", "fa-vimeo", "Vimeo"],
  ["fab", "fa-dailymotion", "Dailymotion"],
]

// Map prefix to FA class prefix
const PREFIX_CLASS = { fas: "fa-solid", far: "fa-regular", fab: "fa-brands" }
const CATEGORY_MAP = { solid: "fas", regular: "far", brands: "fab" }

/**
 * Returns the full FA class string for an icon entry, e.g. "fa-solid fa-house"
 */
function getFaClass(prefix, name) {
  return `${PREFIX_CLASS[prefix]} ${name}`
}

/**
 * Initialize and render the FA icon picker.
 * @param {Object} DOM - the DOM module
 * @param {Function} onSelect - callback(faClass: string) when icon selected
 * @param {Function} onClear - callback when "clear" is pressed
 */
function initFaPicker(DOM, onSelect, onClear) {
  let currentFilter = ""
  let currentCategory = "all"

  function renderGrid() {
    const grid = DOM.faPickerGrid
    const countEl = DOM.faPickerCount
    if (!grid) return

    const query = currentFilter.toLowerCase()
    const catKey = currentCategory !== "all" ? CATEGORY_MAP[currentCategory] : null

    const filtered = FA_ICONS.filter(([prefix, name, label]) => {
      const matchCat = !catKey || prefix === catKey
      const matchQ =
        !query ||
        label.toLowerCase().includes(query) ||
        name.includes(query) ||
        prefix.includes(query)
      return matchCat && matchQ
    })

    grid.innerHTML = ""
    if (countEl) countEl.textContent = `${filtered.length} icons`

    filtered.forEach(([prefix, name, label]) => {
      const faClass = getFaClass(prefix, name)
      const btn = document.createElement("button")
      btn.type = "button"
      btn.title = `${label} (${faClass})`
      btn.style.cssText = [
        "background:rgba(255,255,255,0.05)",
        "border:1px solid rgba(255,255,255,0.08)",
        "border-radius:8px",
        "color:inherit",
        "cursor:pointer",
        "padding:4px 2px 2px",
        "width:52px",
        "height:52px",
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "justify-content:center",
        "gap:2px",
        "transition:background 0.15s,border-color 0.15s,transform 0.1s",
        "overflow:hidden",
      ].join(";")

      const icon = document.createElement("i")
      icon.className = faClass
      icon.style.cssText = "font-size:1.15rem;display:block;line-height:1;"
      btn.appendChild(icon)

      // Small label
      const lbl = document.createElement("span")
      lbl.textContent = label.length > 8 ? label.slice(0, 7) + "…" : label
      lbl.style.cssText =
        "font-size:0.52rem;opacity:0.55;line-height:1;display:block;max-width:48px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
      btn.appendChild(lbl)

      btn.addEventListener("mouseenter", () => {
        btn.style.background = "rgba(var(--accent-rgb,168,192,255),0.18)"
        btn.style.borderColor = "rgba(var(--accent-rgb,168,192,255),0.5)"
        btn.style.transform = "scale(1.08)"
      })
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "rgba(255,255,255,0.05)"
        btn.style.borderColor = "rgba(255,255,255,0.08)"
        btn.style.transform = "scale(1)"
      })

      btn.addEventListener("click", () => {
        onSelect(faClass)
        closePicker()
      })

      grid.appendChild(btn)
    })

    // After render, validate icons: dim those whose ::before content is "none"
    // (icon doesn't exist in the loaded FA version)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        grid.querySelectorAll("i[class]").forEach((iconEl) => {
          const content = window.getComputedStyle(iconEl, "::before").content
          // "none" or empty string means the icon glyph wasn't found
          if (!content || content === "none" || content === '""' || content === "''") {
            const parentBtn = iconEl.closest("button")
            if (parentBtn) {
              parentBtn.style.opacity = "0.25"
              parentBtn.style.pointerEvents = "none"
              parentBtn.title += " (not available in this FA version)"
            }
          }
        })
      })
    })
  }

  function openPicker() {
    const modal = DOM.faPickerModal
    if (!modal) return
    modal.style.display = "flex"
    // reset search
    if (DOM.faPickerSearch) {
      DOM.faPickerSearch.value = ""
      currentFilter = ""
    }
    if (DOM.faPickerCategory) {
      DOM.faPickerCategory.value = "all"
      currentCategory = "all"
    }
    renderGrid()
    setTimeout(() => DOM.faPickerSearch?.focus(), 80)
  }

  function closePicker() {
    const modal = DOM.faPickerModal
    if (modal) modal.style.display = "none"
  }

  // Events
  DOM.tabIconFaBtn?.addEventListener("click", openPicker)

  DOM.faPickerClose?.addEventListener("click", closePicker)

  DOM.faPickerModal?.addEventListener("click", (e) => {
    if (e.target === DOM.faPickerModal) closePicker()
  })

  DOM.faPickerSearch?.addEventListener("input", () => {
    currentFilter = DOM.faPickerSearch.value
    renderGrid()
  })

  DOM.faPickerCategory?.addEventListener("change", () => {
    currentCategory = DOM.faPickerCategory.value
    renderGrid()
  })

  DOM.faPickerClear?.addEventListener("click", () => {
    onClear()
    closePicker()
  })
}

export { FA_ICONS, getFaClass, initFaPicker }
