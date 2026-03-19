/**
 * SVG Wave Utilities Module
 * Helper functions for SVG wave configuration and color previews
 */

import { getSettings } from "../../services/state.js"

function getSvgWaveParams(settings) {
  return {
    lines: settings.svgWaveLines ?? 5,
    amplitudeX: settings.svgWaveAmplitudeX ?? 200,
    amplitudeY: settings.svgWaveAmplitudeY ?? 80,
    offsetX: settings.svgWaveOffsetX ?? 0,
    smoothness: settings.svgWaveSmoothness ?? 0.5,
    fill: settings.svgWaveFill !== false,
    craziness: settings.svgWaveCraziness ?? 30,
    angle: settings.svgWaveAngle ?? 0,
    startHue: settings.svgWaveStartHue ?? 200,
    startSaturation: settings.svgWaveStartSaturation ?? 70,
    startLightness: settings.svgWaveStartLightness ?? 40,
    endHue: settings.svgWaveEndHue ?? 280,
    endSaturation: settings.svgWaveEndSaturation ?? 70,
    endLightness: settings.svgWaveEndLightness ?? 30,
  }
}

function updateWaveColorPreviews(s, svgWaveStartPreview, svgWaveEndPreview) {
  const sh = s.svgWaveStartHue ?? 200
  const ss = s.svgWaveStartSaturation ?? 70
  const sl = s.svgWaveStartLightness ?? 40
  const eh = s.svgWaveEndHue ?? 280
  const es = s.svgWaveEndSaturation ?? 70
  const el = s.svgWaveEndLightness ?? 30
  if (svgWaveStartPreview)
    svgWaveStartPreview.style.background = `hsl(${sh},${ss}%,${sl}%)`
  if (svgWaveEndPreview)
    svgWaveEndPreview.style.background = `hsl(${eh},${es}%,${el}%)`
}

export { getSvgWaveParams, updateWaveColorPreviews }
