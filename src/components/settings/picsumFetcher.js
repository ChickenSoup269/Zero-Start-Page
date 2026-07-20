/**
 * Picsum Photos Fetcher Module
 * Provides random high-quality wallpapers from picsum.photos — NO API key required.
 * Uses Lorem Picsum (https://picsum.photos) by David Marby & Nijiko Yonskai.
 */

/**
 * Curated Picsum seeds for specific themes.
 * Seeds are stable identifiers that always return the same photo.
 */
const PICSUM_THEMES = [
  { key: "random",         labelEn: "Random",          labelVi: "Ngẫu nhiên",           seeds: [] /* purely random */ },
  { key: "nature",         labelEn: "Nature",           labelVi: "Thiên nhiên",           seeds: [10,15,17,24,29,37,59,82,91,96,117,127,133,145,189,200,219,229,236,246,259,269,274,276,279,287,297,304,308,313,366,397,416,422,433,439,449,457,468,478,483,500,501,503,506,512] },
  { key: "city",           labelEn: "City & Urban",     labelVi: "Đô thị & Phố xá",      seeds: [6,20,30,43,62,69,91,112,120,122,124,143,158,163,173,179,181,191,201,202,209,222,230,238,241,261,265,268,280,298,309,318,326,337,339,341,350,360,374,384,399,411,435,459,475,490] },
  { key: "abstract",       labelEn: "Abstract",         labelVi: "Trừu tượng",            seeds: [1,2,8,11,16,22,31,45,52,56,65,70,77,86,100,114,131,148,165,176,188,206,216,227,242,253,264,275,282,293,302,315,328,343,355,368,382,395,408,421,434,447,460,473,486,499] },
  { key: "architecture",   labelEn: "Architecture",     labelVi: "Kiến trúc",             seeds: [12,18,25,35,48,58,72,85,97,108,119,130,142,155,167,178,193,205,218,228,240,252,263,273,285,295,307,317,329,342,354,367,379,392,405,418,431,444,457,470,483,496,502,507,511,513] },
  { key: "minimal",        labelEn: "Minimal",          labelVi: "Tối giản",              seeds: [3,13,23,33,44,55,66,77,88,99,110,121,132,143,154,165,176,187,198,209,220,231,242,253,264,275,286,297,308,319,330,341,352,363,374,385,396,407,418,429,440,451,462,473,484,495] },
  { key: "technology",     labelEn: "Technology",       labelVi: "Công nghệ",             seeds: [0,9,19,28,39,49,60,71,81,92,103,114,125,136,147,158,169,180,191,202,213,224,235,246,257,268,279,290,301,312,323,334,345,356,367,378,389,400,411,422,433,444,455,466,477,488] },
  { key: "dark",           labelEn: "Dark & Moody",     labelVi: "Tối & Moody",           seeds: [5,14,26,36,47,57,68,79,90,101,111,122,134,144,156,166,177,190,203,214,225,236,247,258,269,281,291,303,314,324,336,346,358,369,380,391,402,413,424,436,446,458,469,480,491,497] },
]

const PICSUM_RECENT_PREFIX = "startpagePicsumRecent:"
const PICSUM_RECENT_LIMIT = 30

function getPicsumRecentSeeds(themeKey) {
  try {
    const raw = localStorage.getItem(`${PICSUM_RECENT_PREFIX}${themeKey}`)
    const parsed = JSON.parse(raw || "[]")
    return Array.isArray(parsed) ? parsed.filter(Number.isFinite) : []
  } catch {
    return []
  }
}

function rememberPicsumSeed(themeKey, seed) {
  const recent = getPicsumRecentSeeds(themeKey).filter((s) => s !== seed)
  recent.unshift(seed)
  try {
    localStorage.setItem(
      `${PICSUM_RECENT_PREFIX}${themeKey}`,
      JSON.stringify(recent.slice(0, PICSUM_RECENT_LIMIT)),
    )
  } catch {}
}

/**
 * Build a Picsum URL with specific seed and dimensions.
 * @param {number} seed - Photo ID or random seed
 * @param {number} width
 * @param {number} height
 * @param {boolean} blur - If true, apply blur (for preview)
 * @returns {string}
 */
function buildPicsumUrl(seed, width, height, blur = false) {
  const blurParam = blur ? "/blur/2" : ""
  const w = Math.min(3840, Math.max(640, Math.round(width)))
  const h = Math.min(2160, Math.max(480, Math.round(height)))
  return `https://picsum.photos/id/${seed}/${w}/${h}${blurParam}`
}

/**
 * Build a Picsum thumbnail URL for gallery preview
 */
function buildPicsumThumbUrl(seed) {
  return `https://picsum.photos/id/${seed}/360/270`
}

/**
 * Get target display dimensions for fetching
 */
function getPicsumTargetDimensions() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  return {
    width: Math.min(2400, Math.round((window.innerWidth || 1920) * dpr)),
    height: Math.min(1600, Math.round((window.innerHeight || 1080) * dpr)),
  }
}

/**
 * Pick a fresh seed for a given theme, avoiding recently seen ones.
 */
function pickPicsumSeed(themeKey) {
  const theme = PICSUM_THEMES.find((t) => t.key === themeKey) || PICSUM_THEMES[0]
  const seeds = theme.seeds

  if (!seeds.length) {
    // Fully random: use a random seed number 1-1000
    return Math.floor(Math.random() * 1000) + 1
  }

  const recent = new Set(getPicsumRecentSeeds(themeKey))
  const fresh = seeds.filter((s) => !recent.has(s))
  const pool = fresh.length ? fresh : seeds
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Fetch a random Picsum photo info (author, link).
 * Picsum /id/{id}/info returns metadata.
 */
async function fetchPicsumPhotoInfo(seed) {
  try {
    const res = await fetch(`https://picsum.photos/id/${seed}/info`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Main function: get a random Picsum background URL for a given theme.
 * Returns { imageUrl, seed, info } where info may be null.
 */
async function getPicsumRandomBackground(themeKey = "random") {
  const { width, height } = getPicsumTargetDimensions()
  const seed = pickPicsumSeed(themeKey)
  const imageUrl = buildPicsumUrl(seed, width, height)
  rememberPicsumSeed(themeKey, seed)

  // Fetch metadata in parallel (non-blocking)
  const info = await fetchPicsumPhotoInfo(seed).catch(() => null)

  return { imageUrl, seed, info, themeKey }
}

/**
 * Preload a Picsum image
 */
function preloadPicsumImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => reject(new Error("Failed to preload Picsum image"))
    img.src = url
  })
}

/**
 * Get all Picsum themes for display
 */
function getPicsumThemes() {
  return PICSUM_THEMES
}

/**
 * Get a list of random Picsum photos for a gallery grid (like explorer).
 * Returns array of { seed, thumbUrl, imageUrl }
 */
function getPicsumGalleryPage(themeKey = "random", count = 20, page = 1) {
  const theme = PICSUM_THEMES.find((t) => t.key === themeKey) || PICSUM_THEMES[0]
  const { width, height } = getPicsumTargetDimensions()
  const results = []

  if (!theme.seeds.length) {
    // Random mode: generate stable seeds per page
    const offset = (page - 1) * count
    for (let i = 0; i < count; i++) {
      const seed = ((offset + i) * 7 + 42) % 1000 + 1
      results.push({
        seed,
        thumbUrl: buildPicsumThumbUrl(seed),
        imageUrl: buildPicsumUrl(seed, width, height),
      })
    }
  } else {
    const seeds = theme.seeds
    const offset = ((page - 1) * count) % seeds.length
    for (let i = 0; i < Math.min(count, seeds.length); i++) {
      const seed = seeds[(offset + i) % seeds.length]
      results.push({
        seed,
        thumbUrl: buildPicsumThumbUrl(seed),
        imageUrl: buildPicsumUrl(seed, width, height),
      })
    }
  }

  return results
}

export {
  getPicsumRandomBackground,
  preloadPicsumImage,
  getPicsumThemes,
  getPicsumGalleryPage,
  buildPicsumUrl,
  buildPicsumThumbUrl,
}
