import { StarFall } from "../animations/rainGalaxy.js"
import { FirefliesEffect } from "../animations/fireflies.js"
import { NetworkEffect } from "../animations/network.js"
import { MatrixRain } from "../animations/matrixRain.js"
import { AuraEffect } from "../animations/aura.js"
import { WindEffect } from "../animations/wind.js"
import { HackerEffect } from "../animations/hacker.js"
import { PixelCubes } from "../animations/pixelCubes.js"
import { Jellyfish } from "../animations/jellyfish.js"
import { SakuraEffect } from "../animations/sakura.js"
import { SnowfallEffect } from "../animations/snowfall.js"
import { SnowfallHDEffect } from "../animations/snowfallHD.js"
import { AuroraWaveEffect } from "../animations/auroraWave.js"
import { NorthernLightsEffect } from "../animations/northernLights.js"
import { BubblesEffect } from "../animations/bubbles.js"
import { CursorTrailEffect } from "../animations/cursorTrail.js"
import { FlashlightEffect } from "../animations/flashlight.js"
import { GridScanEffect } from "../animations/gridScan.js"
import { RainHDEffect } from "../animations/rainHD.js"
import { MusicBarsEffect } from "../animations/musicBars.js"
import { RainbowBackground } from "../animations/rainbowBackground.js"
import { WavyLinesEffect } from "../animations/wavyLines.js"
import { OceanWaveEffect } from "../animations/oceanWave.js"
import { CloudDriftEffect } from "../animations/cloudDrift.js"
import { NeonGridBackground } from "../animations/neonGrid.js"
import { FrostedGlassOrbsBackground } from "../animations/frostedGlassOrbs.js"
import { BlackHoleBackground } from "../animations/blackHole.js"
import { FirefliesHD } from "../animations/firefliesHD.js"
import { SvgWaveGenerator } from "../animations/svgWaveGenerator.js"
import { AutumnLeavesEffect } from "../animations/autumnLeaves.js"
import { GreenLeavesEffect } from "../animations/greenLeaves.js"
import { FallingLeavesSettledEffect } from "../animations/fallingLeavesSettled.js"
import { SunbeamEffect } from "../animations/sunbeam.js"
import { LightPillarsEffect } from "../animations/lightPillars.js"
import { PixelWeatherEffect } from "../animations/pixelWeather.js"
import { ShinyEffect } from "../animations/shiny.js"
import { LineShinyEffect } from "../animations/lineShiny.js"
import { TetFireworksEffect } from "../animations/tetFireworks.js"
import { ReunificationDayEffect } from "../animations/reunificationDay.js"
import { HalloweenEffect } from "../animations/halloween.js"
import { SkyLanternsEffect } from "../animations/skyLanterns.js"
import { PixelRunEffect } from "../animations/pixelRun.js"
import { NintendoPixelEffect } from "../animations/nintendoPixel.js"
import { RetroGameEffect } from "../animations/retroGame.js"
import { MeteorEffect } from "../animations/meteor.js"
import { WavyPatternEffect } from "../animations/wavyPattern.js"
import { AngledPatternEffect } from "../animations/angledPattern.js"
import { CrtScanlinesEffect } from "../animations/crtScanlines.js"
import { PlantGrowthEffect } from "../animations/plantGrowth.js"
import { LiquidEther } from "../animations/liquidEther.js"
import { SplashCursor } from "../animations/splashCursor.js"
import { splashCursorOptionsFromSettings } from "../animations/splashCursorOptions.js"
import { OceanFishEffect } from "../animations/oceanFish.js"
import { FloatingLinesEffect } from "../animations/floatingLines.js"
import { PixelBlastEffect } from "../animations/pixelBlast.js"
import { HyperspaceEffect } from "../animations/hyperspace.js"
import { GradientV2Effect } from "../animations/gradientV2.js"
import { PixelSnowEffect } from "../animations/pixelSnow.js"
import { SoftAuroraEffect } from "../animations/softAurora.js"
import { SilkEffect } from "../animations/silk.js"
import { LightPillarEffect } from "../animations/lightPillar.js"

import { DVDEffect } from "../animations/dvdScreenSaver.js"

export function createEffectFactories(settings) {
  return {
    starFallEffect: () => new StarFall("effect-canvas", settings.starColor),
    firefliesEffect: () => new FirefliesEffect("effect-canvas"),
    networkEffect: () =>
      new NetworkEffect(
        "effect-canvas",
        settings.networkColor || settings.accentColor,
      ),
    matrixRainEffect: () =>
      new MatrixRain("effect-canvas", settings.matrixColor),
    auraEffect: () => new AuraEffect("effect-canvas", settings.auraColor),
    windEffect: () => new WindEffect("effect-canvas", settings.windMode || "2d"),
    hackerEffect: () =>
      new HackerEffect("effect-canvas", settings.hackerColor),
    pixelCubesEffect: () =>
      new PixelCubes(
        "effect-canvas",
        settings.pixelCubesColor,
        settings.pixelCubesShape,
      ),
    neonGridEffect: () =>
      new NeonGridBackground(
        "effect-canvas",
        settings.synthwaveGridColor || "#ff007f",
        settings.synthwaveSunColor || "#ffbe0b",
        settings.synthwaveFullScreen === true
      ),
    frostedGlassOrbsEffect: () =>
      new FrostedGlassOrbsBackground(
        "effect-canvas",
        settings.frostedOrbsColor1 || "#00f2fe",
        settings.frostedOrbsColor2 || "#4facfe"
      ),
    blackHoleEffect: () =>
      new BlackHoleBackground(
        "effect-canvas",
        settings.blackHoleAccretionColor || "#ff5500",
        settings.blackHoleStarColor || "#ffffff"
      ),
    sakuraEffect: () =>
      new SakuraEffect("effect-canvas", settings.sakuraColor || "#ffb7c5"),
    snowfallEffect: () =>
      new SnowfallEffect("effect-canvas", settings.snowfallColor || "#ffffff"),
    snowfallHDEffect: () => new SnowfallHDEffect("effect-canvas"),
    auroraWaveEffect: () =>
      new AuroraWaveEffect(
        "effect-canvas",
        settings.auroraWaveColor || "#00bcd4",
      ),
    northernLightsEffect: () =>
      new NorthernLightsEffect("effect-canvas", {
        color: settings.northernLightsColor || "#00ff88",
        style: settings.northernLightsStyle || "hd",
        brightness: settings.northernLightsBrightness ?? 0.8,
      }),
    bubblesEffect: () =>
      new BubblesEffect("effect-canvas", settings.bubbleColor || "#60c8ff"),
    cursorTrailEffect: () =>
      new CursorTrailEffect(
        "effect-canvas",
        settings.cursorTrailColor || "#60c8ff",
        settings.cursorTrailClickExplosion !== false,
        settings.cursorTrailRandomColor === true,
        settings.cursorTrailStyle || "classic",
      ),
    flashlightEffect: () =>
      new FlashlightEffect("effect-canvas", {
        color: settings.flashlightColor || "#000000",
        size: settings.flashlightSize || 150,
        opacity: settings.flashlightOpacity ?? 0.9,
      }),
    gridScanEffect: () =>
      new GridScanEffect("effect-canvas", settings.gridScanColor || "#00ffcc"),
    rainHDEffect: () =>
      new RainHDEffect("effect-canvas", settings.rainHDColor || "#99ccff"),
    musicBarsEffect: () =>
      new MusicBarsEffect("effect-canvas", settings.musicBarsColor || "#8be9fd"),
    rainbowEffect: () =>
      new RainbowBackground("effect-canvas", settings.rainbowDirection || "left"),
    wavyLinesEffect: () =>
      new WavyLinesEffect("effect-canvas", settings.wavyLinesColor || "#00bcd4"),
    oceanWaveEffect: () =>
      new OceanWaveEffect(
        "effect-canvas",
        settings.oceanWaveColor || "#0077b6",
        settings.oceanWavePosition || "bottom",
      ),
    cloudDriftEffect: () =>
      new CloudDriftEffect(
        "effect-canvas",
        settings.cloudDriftColor || "#0a0a0a",
        settings.cloudDriftMood || "default",
      ),
    firefliesHDEffect: () => new FirefliesHD("effect-canvas"),
    autumnLeavesEffect: () => new AutumnLeavesEffect("effect-canvas"),
    greenLeavesEffect: () => new GreenLeavesEffect("effect-canvas"),
    fallingLeavesSettledEffect: () =>
      new FallingLeavesSettledEffect(
        "effect-canvas",
        settings.fallingLeavesSkin || "maple",
      ),
    sunbeamEffect: () =>
      new SunbeamEffect("effect-canvas", {
        color: settings.sunbeamColor || "#ffffff",
        angle: parseInt(settings.sunbeamAngle) || 0,
        mode: settings.sunbeamMode || "default",
      }),
    lightPillarsEffect: () => new LightPillarsEffect("effect-canvas"),
    pixelWeatherEffect: () =>
      new PixelWeatherEffect(
        "effect-canvas",
        settings.pixelWeatherStyle || "snow",
      ),
    shinyEffect: () =>
      new ShinyEffect("effect-canvas", settings.shinyColor || "#ff0000"),
    lineShinyEffect: () =>
      new LineShinyEffect(
        "effect-canvas",
        settings.lineShinyColor || "#ffffff",
        settings.lineShinyMode || "default"
      ),
    tetFireworksEffect: () => new TetFireworksEffect("effect-canvas", {}),
    reunificationDayEffect: () =>
      new ReunificationDayEffect("effect-canvas", {}),
    halloweenEffect: () => new HalloweenEffect("effect-canvas", {}),
    skyLanternsEffect: () =>
      new SkyLanternsEffect("effect-canvas", {
        type: settings.skyLanternsType || "lantern",
      }),
    pixelRunEffect: () =>
      new PixelRunEffect("effect-canvas", settings.pixelRunColor || "#00e5ff"),
    nintendoPixelEffect: () =>
      new NintendoPixelEffect(
        "effect-canvas",
        settings.nintendoPixelColor || "#63f5ff",
      ),
    retroGameEffect: () =>
      new RetroGameEffect(
        "effect-canvas",
        settings.retroGameColor || "#00ff00",
        settings.retroGameType || "space_invaders",
      ),
    crtScanlinesEffect: () =>
      new CrtScanlinesEffect("effect-canvas", {
        scanColor: settings.crtScanColor || "#7cffad",
        scanFrequency: settings.crtScanFrequency ?? 0.11,
        scanAngle: settings.crtScanAngle ?? 0,
        scanDensity: settings.crtScanDensity ?? 4,
        gamma: settings.crtGamma ?? 0.3,
        backgroundColor: settings.crtBackgroundColor || "#0a140f",
      }),
    meteorEffect: () =>
      new MeteorEffect(
        "effect-canvas",
        settings.meteorColor || settings.starColor || "#ffffff",
      ),
    plantGrowthEffect: () =>
      new PlantGrowthEffect(
        "effect-canvas",
        settings.plantGrowthColor || "#4caf50",
      ),
    oceanFishEffect: () =>
      new OceanFishEffect("effect-canvas", settings.oceanFishColor || "#ff7f50"),
    floatingLinesEffect: () =>
      new FloatingLinesEffect(
        "effect-canvas",
        settings.floatingLinesColor || "#ffffff",
        settings.floatingLinesAngle || 0,
      ),
    pixelBlastEffect: () =>
      new PixelBlastEffect("effect-canvas", {
        variant: settings.pixelBlastVariant || "square",
        pixelSize: settings.pixelBlastSize || 15,
        color: settings.pixelBlastColor || "#B497CF",
        enableRipples: settings.pixelBlastRipples !== false,
        rippleSpeed: settings.pixelBlastRippleSpeed || 0.3,
        rippleThickness: settings.pixelBlastRippleThickness || 0.1,
        rippleIntensityScale: settings.pixelBlastRippleIntensity || 1,
        liquid: settings.pixelBlastLiquid !== false,
        liquidStrength: settings.pixelBlastLiquidStrength ?? 1.0,
        cursorRadius: settings.pixelBlastCursorRadius || 150,
        speed: settings.pixelBlastSpeed || 0.5,
        edgeFade: settings.pixelBlastEdgeFade || 0.2,
        transparent: settings.pixelBlastTransparent !== false,
        backgroundColor: settings.pixelBlastBgColor || "#0a0a0a",
      }),
    wavyPatternEffect: () =>
      new WavyPatternEffect(
        settings.wavyPatternColor1 || "#AB3E5B",
        settings.wavyPatternColor2 || "#FFBE40",
      ),
    angledPatternEffect: () =>
      new AngledPatternEffect(
        settings.angledPatternColor1 || "#ECD078",
        settings.angledPatternColor2 || "#0B486B",
      ),
    jellyfishEffect: () =>
      new Jellyfish(
        "effect-canvas",
        settings.jellyfishColor || "#ffaa00",
        settings.jellyfishType || "jellyfish",
      ),
    hyperspaceEffect: () =>
      new HyperspaceEffect("effect-canvas", settings.accentColor),
    pixelSnowHQEffect: () =>
      new PixelSnowEffect("pixel-snow-hq-canvas", {
        color: settings.pixelSnowHQColor,
        flakeSize: settings.pixelSnowHQFlakeSize,
        minFlakeSize: settings.pixelSnowHQMinFlakeSize,
        pixelResolution: settings.pixelSnowHQPixelResolution,
        speed: settings.pixelSnowHQSpeed,
        depthFade: settings.pixelSnowHQDepthFade,
        farPlane: settings.pixelSnowHQFarPlane,
        brightness: settings.pixelSnowHQBrightness,
        gamma: settings.pixelSnowHQGamma,
        density: settings.pixelSnowHQDensity,
        variant: settings.pixelSnowHQVariant,
        direction: settings.pixelSnowHQDirection,
      }),
    gradientV2Effect: () =>
      new GradientV2Effect("gradient-v2-canvas", {
        color1: settings.gradientV2Color1,
        color2: settings.gradientV2Color2,
        color3: settings.gradientV2Color3,
        timeSpeed: settings.gradientV2TimeSpeed,
        colorBalance: settings.gradientV2ColorBalance,
        warpStrength: settings.gradientV2WarpStrength,
        warpFrequency: settings.gradientV2WarpFrequency,
        warpSpeed: settings.gradientV2WarpSpeed,
        warpAmplitude: settings.gradientV2WarpAmplitude,
        blendAngle: settings.gradientV2BlendAngle,
        blendSoftness: settings.gradientV2BlendSoftness,
        rotationAmount: settings.gradientV2RotationAmount,
        noiseScale: settings.gradientV2NoiseScale,
        grainAmount: settings.gradientV2GrainAmount,
        grainScale: settings.gradientV2GrainScale,
        grainAnimated: settings.gradientV2GrainAnimated,
        contrast: settings.gradientV2Contrast,
        gamma: settings.gradientV2Gamma,
        saturation: settings.gradientV2Saturation,
        centerX: settings.gradientV2CenterX,
        centerY: settings.gradientV2CenterY,
        zoom: settings.gradientV2Zoom,
      }),
    softAuroraEffect: () =>
      new SoftAuroraEffect("soft-aurora-canvas", {
        speed: settings.softAuroraSpeed,
        scale: settings.softAuroraScale,
        brightness: settings.softAuroraBrightness,
        color1: settings.softAuroraColor1,
        color2: settings.softAuroraColor2,
        noiseFrequency: settings.softAuroraNoiseFreq,
        bandHeight: settings.softAuroraBandHeight,
        bandSpread: settings.softAuroraBandSpread,
        enableMouseInteraction: settings.softAuroraEnableMouse,
      }),
    silkEffect: () =>
      new SilkEffect("silk-canvas", {
        color: settings.silkColor,
        speed: settings.silkSpeed,
        scale: settings.silkScale,
        noise: settings.silkNoise,
        rotation: settings.silkRotation,
      }),
    liquidEtherEffect: () => new LiquidEther("liquid-ether-canvas"),
    splashCursorEffect: () =>
      new SplashCursor(
        "splash-cursor-canvas",
        splashCursorOptionsFromSettings(settings),
      ),
    lightPillarEffect: () =>
      new LightPillarEffect("light-pillar-canvas", {
        topColor: settings.lightPillarTopColor,
        bottomColor: settings.lightPillarBottomColor,
        intensity: settings.lightPillarIntensity,
        rotationSpeed: settings.lightPillarRotationSpeed,
        glowAmount: settings.lightPillarGlowAmount,
        pillarWidth: settings.lightPillarWidth,
        pillarHeight: settings.lightPillarHeight,
        noiseIntensity: settings.lightPillarNoiseIntensity,
        pillarRotation: settings.lightPillarRotation,
      }),
    dvdEffect: () =>
      new DVDEffect("effect-canvas", {
        title: settings.dvdTitle || "DVD",
        colorMode: settings.dvdColorMode || "random",
        speed: settings.dvdSpeed || 3,
        cloneCount: settings.dvdCloneCount || 1,
        trail: settings.dvdTrail === true,
        glitch: settings.dvdGlitch === true,
      }),
    svgWaveEffect: () => new SvgWaveGenerator(),
  }
}
