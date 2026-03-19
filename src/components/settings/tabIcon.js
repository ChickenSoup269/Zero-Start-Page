/**
 * Tab Icon Management Module
 * Handles emoji/text icon generation for browser tab favicon
 */

function getTabIconChars(raw) {
  if (!raw) return ""
  const segs = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(raw)].map((s) => s.segment)
    : [...raw]
  return segs.slice(0, 2).join("")
}

function applyTabIcon(text) {
  const link = document.getElementById("tab-favicon")
  if (!link) return
  if (!text) {
    link.removeAttribute("href")
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
    ? [...new Intl.Segmenter().segment(text)].map((s) => s.segment)
    : [...text]
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

function renderTabIconPreview(text, tabIconPreview) {
  if (!tabIconPreview) return
  if (!text) {
    tabIconPreview.textContent = ""
    tabIconPreview.style.fontSize = ""
    return
  }
  const segs = Intl.Segmenter
    ? [...new Intl.Segmenter().segment(text)].map((s) => s.segment)
    : [...text]
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
