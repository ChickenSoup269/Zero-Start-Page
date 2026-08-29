export const updateNotes = {
  vi: {
    changesTitle: "BẢN CẬP NHẬT 2.0.0",
    contributorsTitle: "Người góp công",
    changes: [
      "Nâng cấp giao diện Settings & Micro-steppers: Bổ sung các nút bấm vi bước (- / +) và hỗ trợ cuộn chuột (Mouse Wheel) cho tất cả thanh trượt cài đặt, giúp tùy chỉnh chính xác từng pixel.",
      "Khung xem trước trực tiếp (Live Previews): Xem trước tức thì giao diện Dấu trang (Bookmark Item) & Thẻ thư mục (Group Tab) cùng bảng Custom Title Studio trong cài đặt.",
      "Tối ưu căn chỉnh vị trí & Đồ họa WebGL: Sắp xếp 2D Drag Pad & Quick Align 9-Grid nằm ngang cùng hàng, tinh giản hiệu ứng bóng đổ và viền chữ.",
      "Nút Khôi phục Mặc định (Reset to Defaults): Bổ sung các nút Reset riêng cho từng phân mục (Sizes, Appearance, Tabs, Layout, Typography, Effects) giúp khôi phục dễ dàng.",
      "Hiệu ứng & Widget mới: Tích hợp đầy đủ các hiệu ứng WebGL đỉnh cao (Interactive Fluid, Black Hole, Frosted Glass Orbs, Neon Grid 3D) cùng Widget Habit Tracker và RSS Reader.",
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
      "Settings Modernization & Micro-Steppers: Added tactile (- / +) stepper buttons and smooth mouse wheel scrolling across all range sliders for pixel-perfect adjustments.",
      "Live Interactive Previews: Instant live previews for Bookmark Cards, Folder Group Tabs, and Custom Title Studio directly inside the settings panel.",
      "Optimized Controls & Side-by-Side Alignment: Upgraded the 2D Drag Pad and Quick Align 9-Grid into a clean side-by-side layout, and eliminated redundant nested boxes.",
      "Dedicated Reset-to-Default Buttons: Added individual Reset buttons for each settings group (Sizes, Appearance, Tabs, Layout, Typography, Effects).",
      "New Shaders & Widgets: Complete suite of WebGL shaders (Interactive Fluid, Black Hole, Frosted Glass Orbs, Neon Grid 3D) alongside Habit Tracker and RSS Reader widgets.",
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
