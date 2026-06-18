export const updateNotes = {
  vi: {
    changesTitle: "Có gì mới",
    contributorsTitle: "Người góp công",
    changes: [
      "Hàng loạt Tiện ích mới (Weather & Calendar): Tích hợp widget Dự báo thời tiết chuyên sâu (hỗ trợ API tùy chỉnh, chế độ mini), đồng bộ Google Calendar lịch trình, thêm các kiểu hiển thị lịch nhiều kích cỡ và ứng dụng Google Apps linh hoạt.",
      "Tìm kiếm thông minh với Gemini: Tích hợp trực tiếp thanh tìm kiếm AI Gemini, bổ sung thêm nhiều công cụ tìm kiếm phổ biến, cho phép tự do di chuyển thanh tìm kiếm (Free-move) và chỉnh độ mờ (Blur) theo ý muốn.",
      "Đại tu Đồng hồ & Giao diện độc lạ: Bổ sung các phong cách đồng hồ mới cực chất (Terminal, C4, Hoạt hình Cartoon), tùy biến ngôn ngữ hiển thị ngày tháng, chỉnh màu Accent và tính năng tự động tương phản chữ (Auto-contrast) theo hình nền.",
      "Nâng cấp Widget Mini & Menu chuột phải: Thêm chế độ thu nhỏ (Mini mode) siêu gọn cho các widget, sắp xếp lại Menu ngữ cảnh (Context Menu) chuột phải trực quan hơn, tích hợp nhanh phím tắt cài đặt hiệu ứng.",
      "Cải tiến Trình nhạc & Hiệu ứng động: Đổi mới thanh sóng nhạc nhảy theo bài hát (Floating Music Bars), nâng cấp vòng quay Orbit, tối ưu bộ nhớ đệm giúp máy chạy mượt hơn và thêm tính năng điều khiển nhạc bằng cử chỉ/phím tắt.",
      "Cá nhân hóa Bookmark & Quick Access: Hỗ trợ đổi icon tùy biến cho từng Bookmark, giao diện sửa đổi Popover mới, thêm các hiệu ứng chuyển động khi chuyển nhóm/mở thư mục, và tùy chọn ẩn/hiện số lượng hoặc đường viền.",
      "Đại tu Cài đặt & Hướng dẫn (Onboarding): Tổ chức lại toàn bộ menu cài đặt thành các phần nhỏ giúp tải mượt mà, hỗ trợ sao chép/dán nhanh file cài đặt JSON, thêm tour hướng dẫn tương tác cho người dùng mới.",
      "Siêu tối ưu hiệu năng & Sửa lỗi: Tăng tốc độ khởi động bằng cơ chế tải chậm (Lazy loading), dọn dẹp bộ nhớ đệm (Cache) tự động để tránh tràn RAM, sửa lỗi kéo thả widget khi trình duyệt đang phóng to (Zoom), gỡ bỏ các kết nối cũ (Spotify/Google Identity) để tăng tính bảo mật.",
    ],
    contributors: [
      {
        name: "Dũng Đinh",
        project: "Zero Startpage",
        role: "Bug Hunter & Người đóng góp",
        badge: "3+",
        badgeLabel: "3 báo lỗi",
        note: "Báo lỗi UI (3+) & gợi ý: code màu M3, widget Pomodoro, Google App icon. More M3 tất nhiên 🐧",
      },
      {
        name: "Kiến Huy",
        project: "Zero Startpage",
        role: "Bug Hunter & Người đóng gói",
        badge: "2+",
        badgeLabel: "2 báo lỗi",
        note: "Báo lỗi page title icon (2+), gợi ý nhạc SoundCloud, bookmark folder UI",
      },
      {
        name: "Mhale",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        note: "Báo bug extension bị lỗi khi đóng không mở đúng cách khi restore tab.",
      },
    ],
  },
  en: {
    changesTitle: "What's New",
    contributorsTitle: "Contributors",
    changes: [
      "New Widgets (Weather & Calendar): Implemented an advanced Weather widget (supports custom APIs, mini mode), Google Calendar sync with multiple sizes, and a dynamic Google Apps component.",
      "Gemini Search & Customization: Added integrated Gemini AI search, expanded the list of search engines, introduced a free-moving search bar, and custom background blur controls.",
      "Clock Upgrades & Visuals: Introduced unique new clock styles (Terminal, C4, Cartoon), date language settings, custom clock accent colors, and smart auto-text contrast based on background brightness.",
      "Mini Widget Modes & Better Context Menus: Introduced compact mini modes for various widgets, completely reorganized right-click context menus for faster access, and added effect settings toggles directly to menus.",
      "Music Player & Audio Visuals: Replaced older effects with dynamic Floating Music Bars, overhauled the Orbit visualizer, and optimized reactive music player animation workflows.",
      "Bookmark & Quick Access Enhancements: Added custom bookmark icons, a modern popover editing UI, smooth group-switching animations, and toggles to hide borders or item counts.",
      "Settings Modularization & Interactive Guide: Structured the settings UI for dynamic hydration, added easy copy/paste JSON import/export, and implemented an interactive settings onboarding guide.",
      "Performance Supercharge & Fixes: Optimized startup times via lazy loading, added smart media cache trimming to save RAM, fixed draggable behavior on zoomed viewports, and removed deprecated Spotify/Google Identity integrations.",
    ],
    contributors: [
      {
        name: "Dũng Đinh",
        project: "Zero Startpage",
        role: "Bug Hunter & Contributor",
        badge: "4+",
        badgeLabel: "4 reports",
        note: "Reported UI issues (3+) and suggested M3 color code support, the Pomodoro widget, and Google App icons.",
      },
      {
        name: "Kiến Huy",
        project: "Zero Startpage",
        role: "Bug Hunter & Packager",
        badge: "2+",
        badgeLabel: "2 report",
        note: "Reported the page title icon issue (1+) and suggested SoundCloud music support.",
      },
      {
        name: "Mhale",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "1+",
        badgeLabel: "1 report",
        note: "Report indicates a bug where the extension fails to open properly when closing or restoring a tab.",
      },
    ],
  },
}

export function getUpdateNotes(language) {
  return language === "vi" ? updateNotes.vi : updateNotes.en
}
