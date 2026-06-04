export const updateNotes = {
  vi: {
    changesTitle: "Có gì mới",
    contributorsTitle: "Người góp công",
    changes: [
      "Hệ sinh thái Theme & Preset: Ra mắt liên kết Theme Web (Beta), cho phép chia sẻ và áp dụng cấu hình thông qua mã Preset Code. Hỗ trợ gộp hình nền khi import thay vì ghi đè dữ liệu cũ.",
      "Đại tu Bookmark & Stack: Hỗ trợ kéo thả (Drag-and-drop) trong popup stack, tùy chọn mở liên kết trong tab mới, và hệ thống Hoàn tác (Undo) mạnh mẽ khi xóa hoặc chỉnh sửa.",
      "Tối ưu hóa hình ảnh & Hiệu năng: Bổ sung tính năng nén ảnh (Compress) trực tiếp trong cài đặt, tùy chọn chất lượng media 'Tiny' và hệ thống giám sát hiệu năng (Performance Mode) tự động.",
      "Cá nhân hóa Material Design 3 (M3): Tích hợp trích xuất màu chủ đạo từ hình nền, bổ sung các tùy chọn giao diện M3 Accent cho Widget, Music Player và thanh truy cập nhanh.",
      "Nâng cấp Widget & Tiện ích: Hỗ trợ âm thanh báo thức tùy chỉnh (Pomodoro), hiển thị lịch âm trên đồng hồ, và các phong cách đồng hồ mới (Aurora Ribbon, Lunar Orbit, Cyber Pulse).",
      "Hệ thống Thông báo Toast: Triển khai hệ thống thông báo nhanh (Toast) để phản hồi tức thì các thao tác người dùng như thay đổi cài đặt hoặc áp dụng theme.",
      "Điều khiển Media đa nguồn: Mở rộng hỗ trợ Spotify, SoundCloud, Zing MP3, NCT và Apple Music với khả năng ưu tiên tab media và tùy chỉnh biểu tượng nguồn nhạc.",
      "Cải thiện độ ổn định: Giới hạn vị trí kéo thả trong màn hình (clamping), tối ưu hóa luồng khởi động lần đầu, và dọn dẹp các tùy chọn cũ để giao diện gọn gàng hơn.",
    ],
    contributors: [
      {
        name: "Dũng Đinh",
        project: "Zero Startpage",
        role: "Bug Hunter & Người đóng góp",
        badge: "3+",
        badgeLabel: "3 báo lỗi",
        note: "Báo lỗi UI (3+) & gợi ý: code màu M3, widget Pomodoro, Google App icon.",
      },
      {
        name: "Trần Anh Quân",
        project: "Zero Startpage",
        role: "Bug Hunter & Người đóng gói",
        badge: "1+",
        badgeLabel: "1 báo lỗi",
        note: "Báo lỗi page title icon (1+) & gợi ý nhạc SoundCloud.",
      },
      {
        name: "Ẩn danh (1)",
        project: "Zero Startpage",
        role: "Người đóng góp",
        note: "Gợi ý sắp xếp các bookmark vào group.",
      },
      {
        name: "Ẩn danh (2)",
        project: "Zero Startpage",
        role: "Người đóng góp",
        note: "Gợi ý thêm lệnh mở nhanh và button xem changelog.",
      },
      {
        name: "Ẩn danh (3)",
        project: "Zero Startpage",
        role: "Bug Hunter",
        note: "Phát hiện bug ở spotify",
      },
      {
        name: "Ẩn danh (4)",
        project: "Zero Startpage",
        role: "Người đóng góp",
        note: "Bookmark không thay thế newtab",
      },
    ],
  },
  en: {
    changesTitle: "What's New",
    contributorsTitle: "Contributors",
    changes: [
      "Theme & Preset Ecosystem: Launched Theme Web (Beta) link for community themes. Introduced Preset Codes for easy sharing and improved import logic to merge backgrounds without overwriting.",
      "Bookmark & Stack Overhaul: Added drag-and-drop support within stack popups, new-tab open behavior settings, and a robust Undo system for deletions and edits.",
      "Image Optimization & Performance: Added in-app image compression, a 'Tiny' media quality option, and an automated Performance Mode to optimize effects based on system resources.",
      "M3 Personalization: Added M3 dynamic color extraction from backgrounds and introduced M3 Accent skin options for Widgets, Music Player, and Quick Access bar.",
      "Widget & Utility Upgrades: Added custom alarm sounds for Pomodoro, Lunar calendar display on the clock, and new clock styles (Aurora Ribbon, Lunar Orbit, Cyber Pulse).",
      "Toast Notification System: Implemented a new toast notification system for real-time user feedback on settings changes and theme applications.",
      "Multi-source Media Control: Expanded support for Spotify, SoundCloud, Zing MP3, NCT, and Apple Music with media tab prioritization and customizable source icons.",
      "Stability Improvements: Implemented viewport clamping for draggables, optimized first-run experience, and removed deprecated settings for a cleaner layout.",
    ],
    contributors: [
      {
        name: "Dũng Đinh",
        project: "Zero Startpage",
        role: "Bug Hunter & Contributor",
        badge: "3+",
        badgeLabel: "3 reports",
        note: "Reported UI issues (3+) and suggested M3 color code support, the Pomodoro widget, and Google App icons.",
      },
      {
        name: "Trần Anh Quân",
        project: "Zero Startpage",
        role: "Bug Hunter & Packager",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Reported the page title icon issue (1+) and suggested SoundCloud music support.",
      },
      {
        name: "Anonymous (1)",
        project: "Zero Startpage",
        role: "Contributor",
        note: "Suggested sorting bookmarks into groups.",
      },
      {
        name: "Anonymous (2)",
        project: "Zero Startpage",
        role: "Contributor",
        note: "Suggested more quick open commands and a changelog button.",
      },
      {
        name: "Anonymous (3)",
        project: "Zero Startpage",
        role: "Bug Hunter",
        note: "Reported a bug in the Spotify integration.",
      },
      {
        name: "Anonymous (4)",
        project: "Zero Startpage",
        role: "Contributor",
        note: "Suggested improvements to the user interface.",
      },
    ],
  },
}

export function getUpdateNotes(language) {
  return language === "vi" ? updateNotes.vi : updateNotes.en
}
