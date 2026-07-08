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
  {
    key: "ocean-coast",
    topic: "nature",
    collections: [],
    keywords: [
      "ocean coast wallpaper",
      "tropical beach landscape",
      "blue sea aerial",
      "calm ocean sunset",
      "coastal cliffs photography",
    ],
    labelEn: "Ocean & Coast",
    labelVi: "Biển & Bờ biển",
  },
  {
    key: "mountains",
    topic: "nature",
    collections: [],
    keywords: [
      "mountain landscape wallpaper",
      "snowy mountains sunrise",
      "alpine lake landscape",
      "misty mountain forest",
      "dramatic mountain range",
    ],
    labelEn: "Mountains",
    labelVi: "Núi non",
  },
  {
    key: "night-city",
    topic: "",
    collections: [],
    keywords: [
      "night city skyline",
      "rainy city street night",
      "urban lights wallpaper",
      "tokyo night street",
      "city bokeh night",
    ],
    labelEn: "Night City",
    labelVi: "Thành phố đêm",
  },
  {
    key: "dark-moody",
    topic: "wallpapers",
    collections: [],
    keywords: [
      "dark moody wallpaper",
      "black aesthetic background",
      "low key landscape",
      "dark forest atmosphere",
      "moody minimal wallpaper",
    ],
    labelEn: "Dark & Moody",
    labelVi: "Tối & Moody",
  },
  {
    key: "soft-pastel",
    topic: "wallpapers",
    collections: [],
    keywords: [
      "soft pastel wallpaper",
      "pastel sky clouds",
      "minimal pastel background",
      "gentle color landscape",
      "dreamy pastel aesthetic",
    ],
    labelEn: "Soft Pastel",
    labelVi: "Pastel nhẹ",
  },
  {
    key: "abstract-color",
    topic: "textures-patterns",
    collections: [],
    keywords: [
      "abstract color wallpaper",
      "fluid gradient abstract",
      "colorful texture background",
      "iridescent abstract",
      "modern abstract background",
    ],
    labelEn: "Abstract Color",
    labelVi: "Màu trừu tượng",
  },
  {
    key: "desk-workspace",
    topic: "",
    collections: [],
    keywords: [
      "minimal desk setup",
      "cozy workspace",
      "clean desk aesthetic",
      "home office setup",
      "productivity workspace",
    ],
    labelEn: "Desk & Workspace",
    labelVi: "Bàn làm việc",
  },
  {
    key: "forest-green",
    topic: "nature",
    collections: [],
    keywords: [
      "green forest wallpaper",
      "moss forest landscape",
      "rainforest path",
      "sunlight through trees",
      "lush green nature",
    ],
    labelEn: "Forest Green",
    labelVi: "Rừng xanh",
  },
  {
    key: "desert-warm",
    topic: "nature",
    collections: [],
    keywords: [
      "desert landscape wallpaper",
      "sand dunes sunset",
      "warm desert road",
      "arizona desert landscape",
      "minimal desert aesthetic",
    ],
    labelEn: "Desert Warm",
    labelVi: "Sa mạc ấm",
  },
  {
    key: "gaming-setup",
    topic: "",
    collections: [],
    keywords: [
      "gaming setup rgb wallpaper",
      "gaming room aesthetic",
      "battlestation desk setup",
      "dark gaming room",
      "rgb pc setup",
    ],
    labelEn: "Gaming Setup",
    labelVi: "Gaming & Setup",
  },
  {
    key: "anime-aesthetic",
    topic: "",
    collections: [],
    keywords: [
      "anime aesthetic wallpaper",
      "japanese anime landscape",
      "cozy anime room wallpaper",
      "dreamy anime scenery",
      "studio ghibli aesthetic",
    ],
    labelEn: "Anime Aesthetic",
    labelVi: "Phong cách Anime",
  },
  {
    key: "retro-vintage",
    topic: "",
    collections: [],
    keywords: [
      "retro vintage wallpaper",
      "vintage film grain aesthetic",
      "retro 80s neon",
      "old photo aesthetic",
      "vintage car city",
    ],
    labelEn: "Retro & Vintage",
    labelVi: "Retro & Cổ điển",
  },
  {
    key: "underwater",
    topic: "nature",
    collections: [],
    keywords: [
      "underwater photography ocean",
      "deep sea coral reef",
      "underwater light wallpaper",
      "tropical fish reef",
      "blue ocean underwater",
    ],
    labelEn: "Underwater",
    labelVi: "Thế giới dưới nước",
  },
  {
    key: "aerial-view",
    topic: "",
    collections: [],
    keywords: [
      "aerial photography drone landscape",
      "birds eye view city",
      "top down nature aerial",
      "drone shot ocean coast",
      "aerial farm field pattern",
    ],
    labelEn: "Aerial View",
    labelVi: "Nhìn từ trên cao",
  },
  {
    key: "winter-snow",
    topic: "nature",
    collections: [],
    keywords: [
      "winter snow landscape wallpaper",
      "snowy forest path",
      "frozen lake winter",
      "christmas winter aesthetic",
      "ice snow mountain",
    ],
    labelEn: "Winter & Snow",
    labelVi: "Mùa đông & Tuyết",
  },
  {
    key: "autumn-fall",
    topic: "nature",
    collections: [],
    keywords: [
      "autumn fall foliage wallpaper",
      "orange autumn forest",
      "fall leaves path landscape",
      "cozy autumn aesthetic",
      "autumn misty forest",
    ],
    labelEn: "Autumn & Fall",
    labelVi: "Mùa thu",
  },
  {
    key: "sunrise-sunset",
    topic: "nature",
    collections: [],
    keywords: [
      "golden hour sunset landscape",
      "sunrise mountain silhouette",
      "sunset beach horizon",
      "dramatic golden sunset",
      "sunrise fog valley",
    ],
    labelEn: "Sunrise & Sunset",
    labelVi: "Bình minh & Hoàng hôn",
  },
  {
    key: "coffee-cozy",
    topic: "",
    collections: [],
    keywords: [
      "coffee cozy aesthetic wallpaper",
      "cafe morning aesthetic",
      "coffee book cozy",
      "warm cozy morning",
      "hygge aesthetic cozy home",
    ],
    labelEn: "Coffee & Cozy",
    labelVi: "Cà phê & Ấm cúng",
  },
  {
    key: "japan-asia",
    topic: "",
    collections: [],
    keywords: [
      "japan landscape wallpaper",
      "japanese temple cherry blossom",
      "tokyo city japan",
      "japanese zen garden",
      "asia landscape aesthetic",
    ],
    labelEn: "Japan & Asia",
    labelVi: "Nhật Bản & Châu Á",
  },
  {
    key: "dark-academia",
    topic: "",
    collections: [],
    keywords: [
      "dark academia aesthetic wallpaper",
      "library books dark aesthetic",
      "oxford gothic architecture",
      "moody academic wallpaper",
      "vintage study aesthetic",
    ],
    labelEn: "Dark Academia",
    labelVi: "Dark Academia",
  },
  {
    key: "neon-lights",
    topic: "",
    collections: [],
    keywords: [
      "neon lights photography wallpaper",
      "neon sign night city",
      "colorful neon street",
      "neon glow aesthetic",
      "neon light bar night",
    ],
    labelEn: "Neon Lights",
    labelVi: "Đèn neon",
  },
  {
    key: "milky-way",
    topic: "nature",
    collections: [],
    keywords: [
      "milky way astrophotography wallpaper",
      "starry night sky landscape",
      "galaxy stars night mountain",
      "night sky stars photography",
      "astro landscape stars",
    ],
    labelEn: "Milky Way",
    labelVi: "Dải Ngân Hà",
  },
  {
    key: "rain-storm",
    topic: "nature",
    collections: [],
    keywords: [
      "rain storm photography wallpaper",
      "rainy window aesthetic",
      "storm lightning landscape",
      "moody rain city",
      "rain drops abstract",
    ],
    labelEn: "Rain & Storm",
    labelVi: "Mưa & Bão",
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
  "ocean",
  "mountains",
  "night city",
  "abstract",
  "workspace",
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
  ocean: ["ocean coast", "blue sea aerial", "tropical beach"],
  mountains: ["mountain landscape", "alpine lake", "snowy mountains"],
  "night city": ["night city skyline", "rainy city street", "urban lights"],
  abstract: ["abstract color", "fluid gradient", "modern abstract"],
  workspace: ["minimal desk setup", "cozy workspace", "home office"],
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
