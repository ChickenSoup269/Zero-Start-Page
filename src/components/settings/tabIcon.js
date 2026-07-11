/**
 * Tab Icon Management Module
 * Handles emoji/text/FA icon generation for browser tab favicon
 * Supports: text (≤2 chars), emoji, image (data URL/URL), Font Awesome class, transparent BG
 */

import { getSettings } from "../../services/state.js"

function getTabIconChars(raw) {
  if (!raw) return ""
  if (/^(data:image\/|blob:|https?:\/\/)/i.test(raw)) return raw
  const segs = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(raw)].map((s) => s.segment)
    : [...raw]
  return segs.slice(0, 2).join("")
}

function isImageIcon(value) {
  return (
    typeof value === "string" &&
    /^(data:image\/|blob:|https?:\/\/)/i.test(value)
  )
}

function isFaIcon(value) {
  if (typeof value !== "string") return false
  const v = value.trim()
  // FA 6 style: "fa-solid fa-house", "fa-brands fa-github", "fa-regular fa-star"
  // FA 5 style: "fas fa-house", "fab fa-github", "far fa-star"
  return (
    /^(fa-solid|fa-regular|fa-brands)\s+fa-\S/.test(v) ||
    /^fa[bsr]\s+fa-\S/.test(v)
  )
}

/**
 * Render a Font Awesome icon onto a canvas context.
 *
 * Strategy:
 *  1. Insert a hidden <i> with the FA class so the browser applies the FA CSS.
 *  2. Read ::before { content, font-family, font-weight } from computed styles.
 *     getComputedStyle returns the ACTUAL Unicode character inside quotes,
 *     e.g. content = '"<private-use-char>"' — just strip the surrounding quotes.
 *  3. Draw the glyph on canvas using the resolved font-family + weight.
 *  4. Use double-rAF to ensure the web font has been applied before reading.
 */
function drawFaIconOnCanvas(ctx, faClass, size, textColor) {
  return new Promise((resolve) => {
    const el = document.createElement("i")
    el.className = faClass
    // position:fixed so it is in the layout/font cascade but off-screen
    el.style.cssText = [
      "position:fixed",
      "left:-9999px",
      "top:0",
      `font-size:${Math.round(size * 0.58)}px`,
      "visibility:hidden",
      "pointer-events:none",
    ].join(";")
    document.body.appendChild(el)

    // Double rAF: first rAF triggers layout, second ensures web-font paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const pseudo = window.getComputedStyle(el, "::before")
        let content = pseudo.content       // e.g. '"\uf015"' or '"" '
        const fontFamily = pseudo.fontFamily // e.g. '"Font Awesome 6 Free"'
        const fontWeight = pseudo.fontWeight  // e.g. "900"

        document.body.removeChild(el)

        // content from getComputedStyle is already the decoded Unicode char
        // wrapped in quotes: '"<char>"' or "'<char>'"
        // Just strip the outer quote characters.
        if (
          (content.startsWith('"') && content.endsWith('"')) ||
          (content.startsWith("'") && content.endsWith("'"))
        ) {
          content = content.slice(1, -1)
        }

        const isValid = content && content !== "none" && content.length > 0
        if (!isValid) {
          // Fallback: draw a "?" so the favicon is still visible
          ctx.font = `bold ${Math.round(size * 0.5)}px sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillStyle = textColor
          ctx.fillText("?", size / 2, size / 2 + 1)
          resolve()
          return
        }

        const fontSize = Math.round(size * 0.58)
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillStyle = textColor
        ctx.fillText(content, size / 2, size / 2 + 2)
        resolve()
      })
    })
  })
}

async function applyTabIcon(value) {
  const link = document.getElementById("tab-favicon")
  if (!link) return
  if (!value) {
    link.href = "icon/logo.png"
    return
  }
  if (isImageIcon(value)) {
    link.href = value
    return
  }
  const settings = getSettings()
  const transparent = settings.tabIconTransparentBg === true
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")

  if (!transparent) {
    ctx.fillStyle = settings.tabIconBgColor || "#1e1e32"
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(0, 0, size, size, 14)
    } else {
      ctx.rect(0, 0, size, size)
    }
    ctx.fill()
  }

  const textColor = settings.tabIconTextColor || "#ffffff"

  if (isFaIcon(value)) {
    await drawFaIconOnCanvas(ctx, value.trim(), size, textColor)
  } else {
    const segs = Intl.Segmenter
      ? [...new Intl.Segmenter().segment(value)].map((s) => s.segment)
      : [...value]
    const isSingleEmoji = segs.length === 1 && /\p{Emoji}/u.test(segs[0])
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = textColor
    ctx.font = isSingleEmoji
      ? `${size * 0.65}px sans-serif`
      : `bold ${segs.length === 1 ? size * 0.55 : size * 0.42}px sans-serif`
    ctx.fillText(segs.slice(0, 2).join(""), size / 2, size / 2 + 1)
  }

  link.href = canvas.toDataURL("image/png")
}

function renderTabIconPreview(value, tabIconPreview) {
  if (!tabIconPreview) return
  tabIconPreview.innerHTML = ""
  tabIconPreview.style.backgroundImage = ""
  const settings = getSettings()
  const transparent = settings.tabIconTransparentBg === true

  if (!value) {
    tabIconPreview.textContent = ""
    tabIconPreview.style.fontSize = ""
    tabIconPreview.style.backgroundColor = ""
    tabIconPreview.style.color = ""
    return
  }

  if (isImageIcon(value)) {
    const img = document.createElement("img")
    img.src = value
    img.alt = "Tab icon preview"
    img.style.width = "100%"
    img.style.height = "100%"
    img.style.objectFit = "cover"
    tabIconPreview.appendChild(img)
    tabIconPreview.style.fontSize = ""
    tabIconPreview.style.backgroundColor = ""
    tabIconPreview.style.color = ""
    return
  }

  const bgColor = transparent
    ? "transparent"
    : (settings.tabIconBgColor || "#1e1e32")
  tabIconPreview.style.backgroundColor = bgColor
  tabIconPreview.style.color = settings.tabIconTextColor || "#ffffff"

  if (isFaIcon(value)) {
    const i = document.createElement("i")
    i.className = value.trim()
    i.style.fontSize = "16px"
    tabIconPreview.appendChild(i)
    tabIconPreview.style.fontSize = ""
    return
  }

  const segs = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(value)].map((s) => s.segment)
    : [...value]
  const display = segs.slice(0, 2).join("")
  tabIconPreview.textContent = display
  const isSingleEmoji = segs.length === 1 && /\p{Emoji}/u.test(segs[0])
  tabIconPreview.style.fontSize = isSingleEmoji
    ? "18px"
    : segs.length === 1
      ? "17px"
      : "12px"
}

export { getTabIconChars, applyTabIcon, renderTabIconPreview, isFaIcon, isImageIcon }
