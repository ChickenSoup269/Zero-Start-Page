export const updateNotes = {
  vi: {
    changesTitle: "BẢN CẬP NHẬT 2.0.0",
    contributorsTitle: "Người góp công",
    changes: [
      "New WebGL Effects & Wallpaper Sources: Giới thiệu các hiệu ứng shader động cao cấp (Interactive Fluid, Black Hole, Frosted Glass Orbs, Neon Grid 3D, Cinematic Bokeh, DVD Screen Saver), tích hợp kho ảnh Picsum và tự động đổi ngẫu nhiên bộ sưu tập ảnh cục bộ.",
      "New Clock Styles & Custom Title Overhaul: Bổ sung các kiểu đồng hồ Audio Wave, Glass Float, Space Concentric, Dynamic Code, Matrix Word, Divergence Meter cùng hoạt ảnh Custom Title Cyberpunk Glitch, Neon và Rainbow.",
      "Habit Tracker & Enhanced RSS Reader: Giới thiệu widget theo dõi thói quen (Habit Tracker) với thanh tiến trình gradient phân đoạn, nâng cấp trình đọc RSS (hỗ trợ tới 10 nguồn cấp, nút cuộn lên đầu và preset phong phú).",
      "Font Management & Music Skins: Bổ sung các phông chữ mới (Space Grotesk, Fira Code, Bungee Inline) với tìm kiếm trực tiếp, trích xuất màu thumbnail bài hát và giao diện trình phát nhạc dạng dọc/ngang mới.",
      "Settings UI Redesign: Chuyển đổi các mục cài đặt thành thẻ accordion có thể thu gọn, bảng chọn ngôn ngữ dạng lưới nút động, kéo thả tải tệp lên cục bộ và bộ chọn màu 32x32 tiện lợi.",
      "Cloud Sync & Firefox Support: Nâng cấp tính năng tự động sao lưu Google Drive với hiển thị avatar tài khoản, bộ lọc tìm kiếm tệp sao lưu và đồng bộ quyền máy chủ cho Firefox manifest.",
      "Performance & Resource Optimization: Giảm thiểu độ trễ INP và layout thrashing, tự động tạm dừng hoạt ảnh khi tab bị ẩn, tối ưu tải hiệu ứng mờ chuyển tiếp IndexedDB và bổ sung HUD hiệu năng.",
      "UI/UX Refinements: Cải thiện macOS dock hover tooltip, hỗ trợ cấu trúc thư mục lồng nhau sâu cho dấu trang, sửa lỗi thanh tìm kiếm bị lệch vị trí và cải tiến đọc lịch ICS cho sự kiện lặp lại.",
    ],
    contributors: [
      {
        name: "Minh Thiện",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Bookmark layout tràn các bookmark ra viền",
      },
    ],
  },
  en: {
    changesTitle: "BIG UPDATE 2.0.0",
    contributorsTitle: "Contributors",
    changes: [
      "New WebGL Effects & Wallpaper Sources: Introduced high-end animated shaders (Interactive Fluid, Black Hole, Frosted Glass Orbs, Neon Grid 3D, Cinematic Bokeh, DVD Screen Saver), added Picsum photo integration, and local gallery auto-randomizer.",
      "New Clock Styles & Custom Title Overhaul: Added Audio Wave, Glass Float, Space Concentric, Dynamic Code, Matrix Word, and Divergence Meter clock styles, alongside Cyberpunk Glitch, Neon, and Rainbow custom title animations.",
      "Habit Tracker & Enhanced RSS Reader: Introduced a Habit Tracker widget with segmented gradient progress, and overhaul for the RSS reader (supports up to 10 feeds, scroll-to-top button, and rich presets).",
      "Font Management & Music Skins: Added new fonts (Space Grotesk, Fira Code, Bungee Inline) with live search, song thumbnail color extraction, and new vertical/horizontal music player skins.",
      "Settings UI Redesign: Transformed settings sections into collapsible accordion cards, dynamic button grid language selectors, drag-and-drop local uploads, and streamlined 32x32 color pickers.",
      "Cloud Sync & Firefox Support: Overhauled Google Drive auto-backup with account avatar display, backup file search filters, and synced host permissions for Firefox manifest.",
      "Performance & Resource Optimization: Dramatically reduced INP lag and layout thrashing, added auto-pause for animations when tabs are hidden, optimized IndexedDB crossfade loading, and added a Performance HUD.",
      "UI/UX Refinements: Improved macOS dock hover tooltips, enabled deep nested folder structures for bookmarks, fixed search bar shifting, and improved ICS calendar parsing for recurring events.",
    ],
    contributors: [
      {
        name: "Minh Thiện",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Bookmark layout overflow issue where bookmarks overflow past container bounds",
      },
    ],
  },
}

export function getUpdateNotes(language) {
  return language === "vi" ? updateNotes.vi : updateNotes.en
}
