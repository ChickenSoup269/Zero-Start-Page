/**
 * Tab Icon Management Module
 * Handles emoji/text icon generation for browser tab favicon
 */

function getTabIconChars(raw) {
  if (!raw) return ""
  if (/^(data:image\/|blob:|https?:\/\/)/i.test(raw)) return raw
  const segs = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(raw)].map((s) => s.segment)
    : [...raw]
  return segs.slice(0, 2).join("")
}

function isImageIcon(value) {
  return typeof value === "string" && /^(data:image\/|blob:|https?:\/\/)/i.test(value)
}

function applyTabIcon(value) {
  const link = document.getElementById("tab-favicon")
  if (!link) return
  if (!value) {
    link.removeAttribute("href")
    return
  }
  if (isImageIcon(value)) {
    link.href = value
    return
  }
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "rgba(30,30,50,0.85)"
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, size, size, 14)
  } else {
    ctx.rect(0, 0, size, size)
  }
  ctx.fill()
  const segs = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(value)].map((s) => s.segment)
    : [...value]
  const isSingleEmoji = segs.length === 1 && /\p{Emoji}/u.test(segs[0])
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#ffffff"
  ctx.font = isSingleEmoji
    ? `${size * 0.65}px sans-serif`
    : `bold ${segs.length === 1 ? size * 0.55 : size * 0.42}px sans-serif`
  ctx.fillText(segs.slice(0, 2).join(""), size / 2, size / 2 + 1)
  link.href = canvas.toDataURL("image/png")
}

function renderTabIconPreview(value, tabIconPreview) {
  if (!tabIconPreview) return
  tabIconPreview.innerHTML = ""
  tabIconPreview.style.backgroundImage = ""
  if (!value) {
    tabIconPreview.textContent = ""
    tabIconPreview.style.fontSize = ""
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

export { getTabIconChars, applyTabIcon, renderTabIconPreview }
