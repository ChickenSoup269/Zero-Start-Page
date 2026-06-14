export function splashCursorOptionsFromSettings(settings) {
  return {
    simResolution: settings.splashCursorSimResolution ?? 128,
    dyeResolution: settings.splashCursorDyeResolution ?? 512,
    densityDissipation: settings.splashCursorDensityDissipation ?? 3.5,
    velocityDissipation: settings.splashCursorVelocityDissipation ?? 2,
    pressure: settings.splashCursorPressure ?? 0.1,
    pressureIterations: settings.splashCursorPressureIterations ?? 20,
    curl: settings.splashCursorCurl ?? 3,
    splatRadius: settings.splashCursorSplatRadius ?? 0.2,
    splatForce: settings.splashCursorSplatForce ?? 6000,
    shading: settings.splashCursorShading !== false,
    colorUpdateSpeed: settings.splashCursorColorUpdateSpeed ?? 10,
    rainbowMode: settings.splashCursorRainbowMode !== false,
    color: settings.splashCursorColor || "#ff0000",
  }
}
