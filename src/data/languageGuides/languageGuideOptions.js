export const languageGuideOptions = [
  {
    code: "en",
    name: "English",
    englishName: "English",
    nativePromptName: "English",
  },
  {
    code: "vi",
    name: "Tiếng Việt",
    englishName: "Vietnamese",
    nativePromptName: "Vietnamese (Tiếng Việt)",
  },
  {
    code: "ja",
    name: "日本語",
    englishName: "Japanese",
    nativePromptName: "Japanese (日本語)",
  },
  {
    code: "zh",
    name: "中文",
    englishName: "Chinese",
    nativePromptName: "Chinese (中文, Simplified Chinese)",
  },
  {
    code: "ko",
    name: "한국어",
    englishName: "Korean",
    nativePromptName: "Korean (한국어)",
  },
  {
    code: "th",
    name: "ไทย",
    englishName: "Thai",
    nativePromptName: "Thai (ไทย)",
  },
  {
    code: "ru",
    name: "Русский",
    englishName: "Russian",
    nativePromptName: "Russian (Русский)",
  },
  {
    code: "es",
    name: "Español",
    englishName: "Spanish",
    nativePromptName: "Spanish (Español)",
  },
  {
    code: "fr",
    name: "Français",
    englishName: "French",
    nativePromptName: "French (Français)",
  },
  {
    code: "id",
    name: "Bahasa Indonesia",
    englishName: "Indonesian",
    nativePromptName: "Indonesian (Bahasa Indonesia)",
  },
]

export function getLanguageGuideOption(code) {
  return (
    languageGuideOptions.find((option) => option.code === code) ||
    languageGuideOptions[0]
  )
}
