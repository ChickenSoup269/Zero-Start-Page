export const updateNotes = {
  vi: {
    changesTitle: "HOT FIX",
    contributorsTitle: "Người góp công",
    changes: [
      "Đen màn khi khi mở",
      "Tab không hiển thị khi đóng ở mở lại ở restore",
    ],
    contributors: [
      {
        name: "",
        project: "Zero Startpage",
        role: "",
        badge: "",
        badgeLabel: "",
        note: "",
      },
    ],
  },
  en: {
    changesTitle: "HOT FIX",
    contributorsTitle: "Contributors",
    changes: [
      "Black screen when opening",
      "Tab not showing when closing and reopening in restore",
    ],
    contributors: [
      {
        name: "",
        project: "Zero Startpage",
        role: "",
        badge: "",
        badgeLabel: "",
        note: "",
      },
    ],
  },
}

export function getUpdateNotes(language) {
  return language === "vi" ? updateNotes.vi : updateNotes.en
}
