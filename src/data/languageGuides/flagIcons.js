/**
 * High-quality vector SVG flags for all supported languages.
 * Windows OS does not render country flag emojis in Segoe UI Emoji by default,
 * so these inline vector SVGs provide crisp, beautiful national flags across all platforms.
 */
export const SVG_FLAGS = {
  vi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#da251d"/><polygon fill="#ff0" points="450,150 491,277 625,277 516,356 558,483 450,404 342,483 384,356 275,277 409,277"/></svg>`,
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30"><rect width="60" height="30" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#c8102e" stroke-width="3"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></svg>`,
  "en-US": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 10"><rect width="19" height="10" fill="#b22234"/><path d="M0 1.54h19M0 3.08h19M0 4.62h19M0 6.15h19M0 7.69h19M0 9.23h19" stroke="#fff" stroke-width="0.77"/><rect width="7.6" height="5.38" fill="#3c3b6e"/></svg>`,
  de: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#d00"/><rect y="2" width="5" height="1" fill="#ffce00"/></svg>`,
  sv: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#006aa7"/><path d="M5 0v10M0 5h16" stroke="#fecc00" stroke-width="2"/></svg>`,
  ja: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#fff"/><circle cx="450" cy="300" r="180" fill="#bc002d"/></svg>`,
  fr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ed2939"/></svg>`,
  es: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 500"><rect width="750" height="125" fill="#aa151b"/><rect y="125" width="750" height="250" fill="#f1bf00"/><rect y="375" width="750" height="125" fill="#aa151b"/></svg>`,
  ko: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#fff"/><circle cx="450" cy="300" r="150" fill="#cd2e3a"/><path d="M450 150a75 75 0 0 0 0 150 75 75 0 0 1 0 150 150 150 0 0 1 0-300z" fill="#0047a0"/><circle cx="450" cy="225" r="75" fill="#cd2e3a"/></svg>`,
  zh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#de2910"/><polygon fill="#ffde00" points="150,75 163,117 207,117 171,143 185,185 150,159 114,185 128,143 93,117 137,117"/></svg>`,
  "zh-CN": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#de2910"/><polygon fill="#ffde00" points="150,75 163,117 207,117 171,143 185,185 150,159 114,185 128,143 93,117 137,117"/></svg>`,
  "zh-TW": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#fe0000"/><rect width="450" height="300" fill="#000095"/><circle cx="225" cy="150" r="75" fill="#fff"/></svg>`,
  ru: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="2" fill="#fff"/><rect y="2" width="9" height="2" fill="#0039a6"/><rect y="4" width="9" height="2" fill="#d52b1e"/></svg>`,
  id: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="1" fill="#ce1126"/><rect y="1" width="3" height="1" fill="#fff"/></svg>`,
  th: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#a51931"/><rect y="1" width="9" height="4" fill="#f4f5f8"/><rect y="2" width="9" height="2" fill="#2d2a4a"/></svg>`,
}

/**
 * Returns SVG markup for a given language code if available.
 * @param {string} code 
 * @returns {string|null}
 */
export function getLanguageSvgFlag(code) {
  if (!code) return null
  const clean = code.toLowerCase().trim()
  return (
    SVG_FLAGS[clean] ||
    SVG_FLAGS[clean.split("-")[0]] ||
    null
  )
}
