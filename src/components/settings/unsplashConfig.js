/**
 * Unsplash Configuration Module
 * Defines Unsplash API categories, keywords, and search logic
 */

const UNSPLASH_COLLECTIONS = [
  {
    key: "featured",
    topic: "wallpapers",
    collections: ["317099"], // Featured Wallpapers
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
    key: "lofi-aesthetic",
    topic: "",
    collections: ["8933951", "4415449"], // Lo-fi, Aesthetic collections
    keywords: [
      "lofi aesthetic",
      "vaporwave wallpaper",
      "retro anime aesthetic",
      "moody night city lofi",
      "cozy room aesthetic",
    ],
    labelEn: "Lo-fi Aesthetic",
    labelVi: "Phong cách Lo-fi",
  },
  {
    key: "cyberpunk-future",
    topic: "",
    collections: ["9354012"], // Cyberpunk & Future
    keywords: [
      "cyberpunk city night",
      "futuristic neon city",
      "blade runner aesthetic",
      "night urban neon lights",
      "synthwave wallpaper",
    ],
    labelEn: "Cyberpunk & Future",
    labelVi: "Tương lai & Cyberpunk",
  },
  {
    key: "minimalism",
    topic: "wallpapers",
    collections: ["1065976"], // Minimalism
    keywords: [
      "minimalist landscape",
      "clean aesthetic wallpaper",
      "minimalist architecture",
      "simple background hd",
      "muted colors nature",
    ],
    labelEn: "Minimalism",
    labelVi: "Tối giản",
  },
  {
    key: "space-galaxy",
    topic: "nature",
    collections: ["1111575"], // Space
    keywords: [
      "astrophotography galaxy",
      "deep space nebula",
      "starry night sky",
      "milky way photography",
      "cosmic wallpaper",
    ],
    labelEn: "Space & Galaxy",
    labelVi: "Vũ trụ & Thiên hà",
  },
  {
    key: "macro-world",
    topic: "nature",
    collections: ["17098", "927950"], // Macro
    keywords: [
      "macro photography nature",
      "abstract close up",
      "flower macro wallpaper",
      "insect macro detail",
    ],
    labelEn: "Macro World",
    labelVi: "Thế giới vi mô",
  },
  {
    key: "new-spring",
    topic: "",
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
    key: "wallpapers",
    topic: "wallpapers",
    collections: [],
    keywords: [
      "wallpaper hd",
      "desktop wallpaper 4k",
      "minimal wallpaper",
      "aesthetic wallpaper",
      "cinematic landscape",
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
]

const RANDOM_SEARCH_CATEGORIES = [
  "nature",
  "technology",
  "food",
  "travel",
  "architecture",
  "fashion",
  "cyberpunk",
  "minimalism",
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
  cyberpunk: ["cyberpunk city", "neon night", "futuristic urban"],
  minimalism: ["minimalist landscape", "clean aesthetic", "simple nature"],
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
