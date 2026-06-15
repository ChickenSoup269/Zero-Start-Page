export const TIMER_ALARM_BASE_URL =
  "https://raw.githubusercontent.com/ChickenSoup269/imagesForRepo/main/sounds/"

export const CUSTOM_ALARM_SOUND_KEY = "custom_alarm_sound"
export const DEFAULT_TIMER_ALARM_SOUND = "bedside_clock_alarm"

export const TIMER_ALARM_SOUNDS = {
  bedside_clock_alarm: {
    file: "bedside_clock_alarm.mp3",
    label: "Bedside Clock Alarm",
    i18nKey: "timer_alarm_bedside",
  },
  among_us_sabotage: {
    file: "alexis_gaming_cam-among-us-alarme-sabotage-393155.mp3",
    label: "Among Us Sabotage",
    i18nKey: "timer_alarm_among_us",
  },
  // Ringtone source: https://pixabay.com/users/universfield-28281460/
  universfield_ringtone_014: {
    file: "universfield-ringtone-014-133357.mp3",
    label: "Ringtone 014",
    i18nKey: "timer_alarm_ringtone_014",
  },
  universfield_ringtone_022: {
    file: "universfield-ringtone-022-376904.mp3",
    label: "Ringtone 022",
    i18nKey: "timer_alarm_ringtone_022",
  },
  universfield_ringtone_025: {
    file: "universfield-ringtone-025-376905.mp3",
    label: "Ringtone 025",
    i18nKey: "timer_alarm_ringtone_025",
  },
  universfield_ringtone_046: {
    file: "universfield-ringtone-046-494552.mp3",
    label: "Ringtone 046",
    i18nKey: "timer_alarm_ringtone_046",
  },
  universfield_ringtone_064: {
    file: "universfield-ringtone-064-496264.mp3",
    label: "Ringtone 064",
    i18nKey: "timer_alarm_ringtone_064",
  },
  universfield_ringtone_070: {
    file: "universfield-ringtone-070-496271.mp3",
    label: "Ringtone 070",
    i18nKey: "timer_alarm_ringtone_070",
  },
  morning_flower: {
    file: "morning_flower.mp3",
    label: "Morning Flower",
    i18nKey: "timer_alarm_morning_flower",
  },
  zalo: {
    file: "zalo.mp3",
    label: "Zalo ringtone",
    i18nKey: "timer_alarm_zalo",
  },
  iphone_alarm: {
    file: "iphone_alarm.mp3",
    label: "iPhone Alarm",
    i18nKey: "timer_alarm_iphone_alarm",
  },
  subnautica_alterra: {
    file: "subnautica_psa_beep.mp3",
    label: "Subnautica PSA Beep",
    i18nKey: "timer_alarm_subnautica_alterra",
  },
  mambo: {
    file: "mambo.mp3",
    label: "Mambo",
    i18nKey: "timer_alarm_mambo",
  },
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function getTimerAlarmLabel(sound, i18n = {}) {
  return i18n[sound.i18nKey] || sound.label
}

export function getCustomAlarmLabel(settings = {}, i18n = {}) {
  return (
    settings.timerCustomAlarmSoundName ||
    i18n.timer_alarm_custom ||
    "Custom Sound"
  )
}

export function getTimerAlarmUrl(soundKey) {
  const sound =
    TIMER_ALARM_SOUNDS[soundKey] ||
    TIMER_ALARM_SOUNDS[DEFAULT_TIMER_ALARM_SOUND]
  return `${TIMER_ALARM_BASE_URL}${sound.file}`
}

export function isTimerAlarmSoundAvailable(soundKey, settings = {}) {
  return (
    Boolean(TIMER_ALARM_SOUNDS[soundKey]) ||
    (soundKey === CUSTOM_ALARM_SOUND_KEY &&
      Boolean(settings.timerCustomAlarmSoundId))
  )
}

export function normalizeTimerAlarmSound(soundKey, settings = {}) {
  return isTimerAlarmSoundAvailable(soundKey, settings)
    ? soundKey
    : DEFAULT_TIMER_ALARM_SOUND
}

export function renderTimerAlarmOptions(
  selectedSound,
  settings = {},
  i18n = {},
) {
  const customLabel = getCustomAlarmLabel(settings, i18n)
  const hasCustomName = Boolean(settings.timerCustomAlarmSoundName)
  return [
    ...Object.entries(TIMER_ALARM_SOUNDS).map(([key, sound]) => ({
      key,
      label: getTimerAlarmLabel(sound, i18n),
      i18nKey: sound.i18nKey,
      disabled: false,
    })),
    {
      key: CUSTOM_ALARM_SOUND_KEY,
      label: customLabel,
      i18nKey: hasCustomName ? "" : "timer_alarm_custom",
      disabled: !settings.timerCustomAlarmSoundId,
    },
  ]
    .map(
      ({ key, label, i18nKey, disabled }) =>
        `<option value="${escapeAttribute(key)}" ${i18nKey ? `data-i18n="${escapeAttribute(i18nKey)}"` : ""} ${key === selectedSound ? "selected" : ""} ${disabled ? "disabled" : ""}>${escapeText(label)}</option>`,
    )
    .join("")
}

export function renderTimerAlarmSelectOptions(
  select,
  selectedSound,
  settings,
  i18n,
) {
  if (!select) return
  select.innerHTML = renderTimerAlarmOptions(selectedSound, settings, i18n)
  select.value = selectedSound
}
