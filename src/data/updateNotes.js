export const updateNotes = {
  vi: {
    changesTitle: "BIG UPDATE 2.0.0",
    contributorsTitle: "Người góp công",
    changes: [
      "Lột xác giao diện & Hiệu ứng WebGL: Thêm hàng loạt hiệu ứng đồ họa đỉnh cao (Interactive Fluid, Black Hole, Frosted Glass Orbs, Neon Grid 3D) và kho ảnh Picsum.",
      "Đồng hồ & Widget mới: Ra mắt các kiểu đồng hồ Audio Wave, Glass Float, Space Concentric cùng 2 Widget mới là Theo dõi Thói quen (Habit Tracker) và Đọc tin RSS.",
      "Siêu tối ưu hiệu năng & Sửa lỗi: Khắc phục triệt để lỗi chớp đen màn hình khi tải trang, tối ưu bộ nhớ RAM/CPU, sửa lỗi mất icon bookmark và bổ sung tính năng hiển thị đầy đủ văn bản folder.",
    ],
    contributors: [
      {
        name: "Mhale",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Delay hoặc chớp một phần màn hình background khi mở tab mới hoặc reload",
      },
      {
        name: "Kiến Huy",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Icon bookmark đôi khi bị mất không rõ nguyên do",
      },
      {
        name: "Lê Minh Thiện",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Show text ở folder bookmark đầy đủ, scroll css cho bookmark folder",
      },
    ],
  },
  en: {
    changesTitle: "BIG UPDATE 2.0.0",
    contributorsTitle: "Contributors",
    changes: [
      "Visual & WebGL Overhaul: Added stunning animated shaders (Interactive Fluid, Black Hole, Frosted Glass Orbs, Neon Grid 3D) and Picsum wallpaper integration.",
      "New Clock Styles & Widgets: Introduced Audio Wave, Glass Float, Space Concentric clock styles, alongside brand new Habit Tracker and RSS Reader widgets.",
      "Performance Supercharge & Bug Fixes: Completely eliminated screen flicker on load, optimized RAM/CPU usage, fixed missing bookmark icons, and enhanced full text displays for folders.",
    ],
    contributors: [
      {
        name: "Mhale",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Delay or flicker a part of the background screen when opening a new tab or reloading",
      },
      {
        name: "Kiến Huy",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Bookmark icons occasionally disappear for unknown reasons",
      },
      {
        name: "Lê Minh Thiện",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Show full text for bookmark folders, add CSS scrollbars for bookmark folders",
      },
    ],
  },
}

export function getUpdateNotes(language) {
  return language === "vi" ? updateNotes.vi : updateNotes.en
}
