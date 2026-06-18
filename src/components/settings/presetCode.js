const PRESET_CODE_PREFIX = "SPC1."
const PRESET_CODE_PREFIX_BY_TYPE = {
  backgroundAnimation: "BAC1.",
}

export function encodePresetCode(type, data) {
  const payload = {
    v: 1,
    type,
    data,
  }
  const json = JSON.stringify(payload)
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
  return `${PRESET_CODE_PREFIX_BY_TYPE[type] || PRESET_CODE_PREFIX}${encoded}`
}

export function decodePresetCode(code, expectedType) {
  const rawCode = String(code || "").trim()
  const expectedPrefix =
    PRESET_CODE_PREFIX_BY_TYPE[expectedType] || PRESET_CODE_PREFIX
  const legacyPrefix = PRESET_CODE_PREFIX
  const prefix = rawCode.startsWith(expectedPrefix)
    ? expectedPrefix
    : rawCode.startsWith(legacyPrefix)
      ? legacyPrefix
      : null

  if (!prefix) {
    throw new Error("Invalid preset code")
  }

  const base64 = rawCode
    .slice(prefix.length)
    .replace(/-/g, "+")
    .replace(/_/g, "/")
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
  const json = decodeURIComponent(escape(atob(padded)))
  const payload = JSON.parse(json)

  if (payload?.v !== 1 || payload?.type !== expectedType || !payload?.data) {
    throw new Error("Preset code type mismatch")
  }

  return payload.data
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, falling back to execCommand:", err)
    }
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}
