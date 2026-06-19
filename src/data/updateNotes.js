export const updateNotes = {
  vi: {
    changesTitle: "Có gì mới",
    contributorsTitle: "Người góp công",
    changes: [],
    contributors: [
      {
        name: "",
        project: "",
        role: "",
        badge: "",
        badgeLabel: "",
        note: "",
      },
    ],
  },
  en: {
    changesTitle: "What's New",
    contributorsTitle: "Contributors",
    changes: [],
    contributors: [
      {
        name: "",
        project: "",
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
