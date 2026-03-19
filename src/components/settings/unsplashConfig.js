/**
 * Unsplash Configuration Module
 * Defines Unsplash API categories, keywords, and search logic
 */

const UNSPLASH_COLLECTIONS = [
  {
    key: "featured",
    topic: "wallpapers",
    collections: [],
    keywords: [
      "featured wallpaper",
      "editorial wallpaper",
      "trending wallpaper",
      "best wallpaper",
    ],
    labelEn: "Featured",
    labelVi: "Nổi bật",
  },
  {
    key: "new-spring",
    topic: "spring-wallpapers",
    collections: [],
    keywords: [
      "new spring wallpaper",
      "spring aesthetic wallpaper",
      "blossom spring landscape",
      "fresh spring nature wallpaper",
    ],
    labelEn: "New Spring",
    labelVi: "Mùa xuân mới",
  },
  {
    key: "spring-wallpapers",
    topic: "spring-wallpapers",
    collections: [],
    keywords: [
      "spring wallpaper",
      "spring flowers wallpaper",
      "pastel spring landscape",
      "cherry blossom wallpaper",
    ],
    labelEn: "Spring Wallpapers",
    labelVi: "Hình nền mùa xuân",
  },
  {
    key: "wallpapers",
    topic: "wallpapers",
    collections: [],
    keywords: [
      "wallpaper hd",
      "desktop wallpaper 4k",
      "minimal wallpaper",
      "aesthetic wallpaper",
    ],
    labelEn: "Wallpapers",
    labelVi: "Hình nền",
  },
  {
    key: "3d-renders",
    topic: "3d-renders",
    collections: [],
    keywords: [
      "3d render abstract wallpaper",
      "cgi art wallpaper",
      "3d gradient wallpaper",
      "surreal 3d scene",
    ],
    labelEn: "3D Renders",
    labelVi: "Đồ họa 3D",
  },
  {
    key: "nature",
    topic: "nature",
    collections: [],
    keywords: [
      "nature landscape wallpaper",
      "mountain forest wallpaper",
      "river valley landscape",
      "wild nature wallpaper",
    ],
    labelEn: "Nature",
    labelVi: "Thiên nhiên",
  },
  {
    key: "textures-patterns",
    topic: "textures-patterns",
    collections: [],
    keywords: [
      "texture pattern background",
      "grain texture wallpaper",
      "abstract pattern wallpaper",
      "minimal texture backdrop",
    ],
    labelEn: "Textures",
    labelVi: "Kết cấu & Họa tiết",
  },
  {
    key: "film",
    topic: "film",
    collections: [],
    keywords: [
      "cinematic film still wallpaper",
      "analog film photography",
      "moody cinema frame",
      "35mm film scene",
    ],
    labelEn: "Film",
    labelVi: "Điện ảnh",
  },
  {
    key: "architecture-interior",
    topic: "architecture-interiors",
    collections: [],
    keywords: [
      "architecture interior design wallpaper",
      "modern architecture facade",
      "interior design minimal",
      "urban architecture lines",
    ],
    labelEn: "Architecture",
    labelVi: "Kiến trúc",
  },
  {
    key: "street-photography",
    topic: "street-photography",
    collections: [],
    keywords: [
      "street photography city wallpaper",
      "night street neon",
      "urban candid street",
      "city life photography",
    ],
    labelEn: "Street Photography",
    labelVi: "Nhiếp ảnh đường phố",
  },
  {
    key: "experimental",
    topic: "experimental",
    collections: [],
    keywords: [
      "experimental abstract wallpaper",
      "creative abstract art",
      "avant garde photography",
      "conceptual visual art",
    ],
    labelEn: "Experimental",
    labelVi: "Thực nghiệm",
  },
  {
    key: "travel",
    topic: "travel",
    collections: [],
    keywords: [
      "travel destination landscape wallpaper",
      "scenic road trip view",
      "coastal travel photography",
      "adventure destination",
    ],
    labelEn: "Travel",
    labelVi: "Du lịch",
  },
  {
    key: "people",
    topic: "people",
    collections: [],
    keywords: [
      "portrait people wallpaper",
      "lifestyle portrait",
      "human expression photography",
      "street portrait",
    ],
    labelEn: "People",
    labelVi: "Con người",
  },
]

const RANDOM_SEARCH_CATEGORIES = [
  "nature",
  "technology",
  "food",
  "travel",
  "architecture",
  "fashion",
]

const RANDOM_SEARCH_KEYWORDS = {
  nature: ["nature landscape", "mountain forest", "river valley"],
  technology: ["technology neon", "future tech", "digital interface"],
  food: ["food photography", "culinary aesthetic", "minimal food"],
  travel: ["travel destination", "adventure landscape", "coastal trip"],
  architecture: [
    "modern architecture",
    "architectural lines",
    "interior design",
  ],
  fashion: ["fashion editorial", "street style", "minimal fashion"],
}

function pickKeyword(collection) {
  const list = collection?.keywords || []
  if (!list.length) return "wallpaper"
  return list[Math.floor(Math.random() * list.length)]
}

function pickRandomSearchCategory() {
  return RANDOM_SEARCH_CATEGORIES[
    Math.floor(Math.random() * RANDOM_SEARCH_CATEGORIES.length)
  ]
}

function buildUnsplashQuery(collection) {
  const baseKeyword = pickKeyword(collection)

  // For Featured, broaden discovery by mixing a random search category.
  if (collection?.key === "featured") {
    const randomCategory = pickRandomSearchCategory()
    const categoryKeywords = RANDOM_SEARCH_KEYWORDS[randomCategory] || [
      randomCategory,
    ]
    const categoryKeyword =
      categoryKeywords[Math.floor(Math.random() * categoryKeywords.length)]
    return `${categoryKeyword} ${baseKeyword}`.trim()
  }

  return baseKeyword
}

export {
  UNSPLASH_COLLECTIONS,
  RANDOM_SEARCH_CATEGORIES,
  RANDOM_SEARCH_KEYWORDS,
  pickKeyword,
  pickRandomSearchCategory,
  buildUnsplashQuery,
}
