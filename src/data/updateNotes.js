export const updateNotes = {
  vi: {
    changesTitle: "HOT FIX 1.8.2",
    contributorsTitle: "Người góp công",
    changes: [
      "Đen màn khi khi mở",
      "Tab không hiển thị khi đóng ở mở lại ở restore",
      "Các thay đổi version 1.8.0 mời các xem ở web",
    ],
    contributors: [
      {
        name: "Mhale & Cong Truong",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "2+",
        badgeLabel: "2 report",
        note: "",
      },
    ],
  },
  en: {
    changesTitle: "HOT FIX 1.8.2",
    contributorsTitle: "Contributors",
    changes: [
      "Black screen when opening",
      "Tab not showing when closing and reopening in restore",
      "All changes in version 1.8.0 please check on the web",
    ],
    contributors: [
      {
        name: "Mhale & Cong Truong",
        project: "Zero Startpage",
        role: "Bug Hunter",
        badge: "2+",
        badgeLabel: "2 report",
        note: "",
      },
    ],
  },
}

export function getUpdateNotes(language) {
  return language === "vi" ? updateNotes.vi : updateNotes.en
}
