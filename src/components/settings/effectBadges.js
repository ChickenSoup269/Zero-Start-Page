/**
 * Effect Badges and Mapping Helpers
 * Extracted from settingsApplier.js
 */

export const EFFECT_KEY_MAP = {
  galaxy: "starFallEffect",
  fireflies: "firefliesEffect",
  murmuration: "murmurationEffect",
  network: "networkEffect",
  matrix: "matrixRainEffect",
  aura: "auraEffect",
  wind: "windEffect",
  hacker: "hackerEffect",
  dvd: "dvdEffect",
  pixelCubes: "pixelCubesEffect",
  jellyfish: "jellyfishEffect",
  sakura: "sakuraEffect",
  snowfall: "snowfallEffect",
  snowfallHD: "snowfallHDEffect",
  auroraWave: "auroraWaveEffect",
  northernLights: "northernLightsEffect",
  bubbles: "bubblesEffect",
  rainHD: "rainHDEffect",
  musicBars: "musicBarsEffect",
  rainbow: "rainbowEffect",
  wavyLines: "wavyLinesEffect",
  oceanWave: "oceanWaveEffect",
  cloudDrift: "cloudDriftEffect",
  firefliesHD: "firefliesHDEffect",
  autumnLeaves: "autumnLeavesEffect",
  greenLeaves: "greenLeavesEffect",
  fallingLeavesSettled: "fallingLeavesSettledEffect",
  sunbeam: "sunbeamEffect",
  lightPillars: "lightPillarsEffect",
  pixelWeather: "pixelWeatherEffect",
  pixelSnowHQ: "pixelSnowHQEffect",
  shiny: "shinyEffect",
  lineShiny: "lineShinyEffect",
  tetFireworks: "tetFireworksEffect",
  reunificationDay: "reunificationDayEffect",
  halloween: "halloweenEffect",
  skyLanterns: "skyLanternsEffect",
  pixelRun: "pixelRunEffect",
  softAurora: "softAuroraEffect",
  silk: "silkEffect",

  nintendoPixel: "nintendoPixelEffect",
  retroGame: "retroGameEffect",
  crtScanlines: "crtScanlinesEffect",
  meteor: "meteorEffect",
  pixelBlast: "pixelBlastEffect",
  neonGrid: "neonGridEffect",
  wavyPattern: "wavyPatternEffect",
  angledPattern: "angledPatternEffect",
  cursorTrail: "cursorTrailEffect",
  flashlight: "flashlightEffect",
  gridScan: "gridScanEffect",
  plantGrowth: "plantGrowthEffect",
  oceanFish: "oceanFishEffect",
  floatingLines: "floatingLinesEffect",
  hyperspace: "hyperspaceEffect",
  liquidEther: "liquidEtherEffect",
  frostedGlassOrbs: "frostedGlassOrbsEffect",
  blackHole: "blackHoleEffect",
  interactiveFluid: "interactiveFluidEffect",
  cinematicBokeh: "cinematicBokehEffect",
}


export function getCreatedEffect(effectInstances, key) {
  if (!effectInstances?.hasEffect?.(key)) return null
  return effectInstances[key] || null
}

export const EFFECTS_WITH_CUSTOM_SETTINGS = new Set([
  "rainbow",
  "galaxy",
  "meteor",
  "network",
  "matrix",
  "aura",
  "northernLights",
  "wind",
  "hacker",
  "dvd",
  "pixelCubes",
  "pixelWeather",
  "pixelBlast",
  "neonGrid",
  "frostedGlassOrbs",
  "blackHole",
  "interactiveFluid",
  "cinematicBokeh",
  "halloween",
  "auroraWave",
  "sunbeam",
  "lightPillars",
  "tetFireworks",
  "reunificationDay",
  "pixelSnowHQ",
  "skyLanterns",
  "jellyfish",
  "sakura",
  "snowfall",
  "autumnLeaves",
  "greenLeaves",
  "fallingLeavesSettled",
  "bubbles",
  "flashlight",
  "gridScan",
  "cursorTrail",
  "plantGrowth",
  "oceanFish",
  "rainHD",
  "musicBars",
  "murmuration",
  "wavyLines",
  "oceanWave",
  "cloudDrift",
  "shiny",
  "lineShiny",
  "pixelRun",
  "nintendoPixel",
  "crtScanlines",
  "retroGame",
  "wavyPattern",
  "angledPattern",
  "floatingLines",
  "softAurora",
])

export function markEffectsWithCustomBadges(container = document) {
  const items = container.querySelectorAll(".effect-item")
  if (!items || items.length === 0) return
  items.forEach((item) => {
    const val = item.getAttribute("data-value")
    if (EFFECTS_WITH_CUSTOM_SETTINGS.has(val)) {
      item.classList.add("has-custom-settings")
      if (!item.querySelector(".effect-custom-badge")) {
        const badge = document.createElement("div")
        badge.className = "effect-custom-badge"
        badge.title =
          window.i18n?.effect_custom_badge_tooltip || "Customizable Effect"
        badge.innerHTML = '<i class="fa-solid fa-sliders"></i>'
        item.appendChild(badge)
      }
    }
  })
}

export function setEffectActive(effectGrid, value) {
  markEffectsWithCustomBadges(effectGrid)
  effectGrid.querySelectorAll(".effect-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.value === value)
  })
}

