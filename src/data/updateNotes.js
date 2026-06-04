export const updateNotes = {
  vi: {
    changesTitle: "Có gì mới",
    contributorsTitle: "Người góp công",
    changes: [
      "Thêm code màu M3 và tinh chỉnh nhận diện màu theo nền.",
      "Bổ sung widget Pomodoro và tối ưu các trạng thái timer.",
      "Cải thiện Google App icon, page title icon và nút xem changelog.",
      "Mở rộng lệnh nhanh, hỗ trợ sắp xếp bookmark vào group tốt hơn.",
      "Thêm gợi ý nhạc SoundCloud và nhiều chỉnh sửa UI nhỏ từ báo lỗi.",
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
      "Added M3 color code support and refined background-based color detection.",
      "Added the Pomodoro widget and improved timer states.",
      "Improved Google App icons, page title icon handling, and the changelog button.",
      "Expanded quick commands and improved bookmark grouping workflows.",
      "Added SoundCloud music suggestions and several UI fixes from user reports.",
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
