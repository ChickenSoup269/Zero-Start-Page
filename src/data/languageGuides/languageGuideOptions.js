export const languageGuideOptions = [
  {
    code: "en",
    name: "English",
    englishName: "English",
    nativePromptName: "English",
    flag: "🇬🇧",
  },
  {
    code: "vi",
    name: "Tiếng Việt",
    englishName: "Vietnamese",
    nativePromptName: "Vietnamese (Tiếng Việt)",
    flag: "🇻🇳",
  },
  {
    code: "de",
    name: "Deutsch",
    englishName: "German",
    nativePromptName: "German (Deutsch)",
    flag: "🇩🇪",
  },
  {
    code: "sv",
    name: "Svenska",
    englishName: "Swedish",
    nativePromptName: "Swedish (Svenska)",
    flag: "🇸🇪",
  },
  {
    code: "ja",
    name: "日本語",
    englishName: "Japanese",
    nativePromptName: "Japanese (日本語)",
    flag: "🇯🇵",
  },
  {
    code: "zh",
    name: "中文",
    englishName: "Chinese",
    nativePromptName: "Chinese (中文, Simplified Chinese)",
    flag: "🇨🇳",
  },
  {
    code: "ko",
    name: "한국어",
    englishName: "Korean",
    nativePromptName: "Korean (한국어)",
    flag: "🇰🇷",
  },
  {
    code: "th",
    name: "ไทย",
    englishName: "Thai",
    nativePromptName: "Thai (ไทย)",
    flag: "🇹🇭",
  },
  {
    code: "ru",
    name: "Русский",
    englishName: "Russian",
    nativePromptName: "Russian (Русский)",
    flag: "🇷🇺",
  },
  {
    code: "es",
    name: "Español",
    englishName: "Spanish",
    nativePromptName: "Spanish (Español)",
    flag: "🇪🇸",
  },
  {
    code: "fr",
    name: "Français",
    englishName: "French",
    nativePromptName: "French (Français)",
    flag: "🇫🇷",
  },
  {
    code: "id",
    name: "Bahasa Indonesia",
    englishName: "Indonesian",
    nativePromptName: "Indonesian (Bahasa Indonesia)",
    flag: "🇮🇩",
  },
]

export function getLanguageGuideOption(code) {
  return (
    languageGuideOptions.find((option) => option.code === code) ||
    languageGuideOptions[0]
  )
}
