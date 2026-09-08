/**
 * Warp Drive / Black Hole Effect — Hollywood AAA Astrophysical 3D Engine
 *
 * Implements the 6 Golden Principles:
 *  1. Relativistic 3D Gargantua Geometry (Interstellar Astrophysics):
 *     - True 3D Kerr/Schwarzschild event horizon with pitch-black gravitational shadow.
 *     - Dual-lensed accretion disk: Equatorial disk + Upper and Lower Gravitational Arcs.
 *     - Multi-order concentric caustic photon rings (n=1, n=2, n=3 series).
 *  2. Relativistic Doppler Beaming & Blueshift/Redshift:
 *     - Intense beaming on the approaching plasma side (left) reaching thermal incandescent white-hot core.
 *     - Gravitational redshift & dimming on the receding side (right).
 *  3. Polar Relativistic Jets & Synchrotron Corona:
 *     - Subtle cosmic magnetic plasma jets erupting along the rotation axis.
 *  4. Gravitationally Lensed Einstein Starfield:
 *     - Background stars curved along hyperbolic geodesics around the photon sphere.
 *  5. Native High-DPI Retina Subpixel Precision & Smooth 60-240Hz Delta Normalization.
 *  6. Full Mouse Parallax & Toggle Support (setMouseEnabled).
 */

export class BlackHoleBackground {
  constructor(canvasId, optionsOrAccretion = "#ff5500", starColor = "#ffffff") {
    let opts = {}
    if (typeof optionsOrAccretion === "object" && optionsOrAccretion !== null) {
      opts = optionsOrAccretion
    } else {
      opts = {
        accretionColor: optionsOrAccretion || "#ff5500",
        starColor: starColor || "#ffffff",
      }
    }

    const origCanvas =
      typeof canvasId === "string"
        ? document.getElementById(canvasId)
        : canvasId
    this.canvasWrapper = origCanvas ? origCanvas.parentElement : document.body

    const existing = document.querySelector(".black-hole-webgl-canvas")
    if (existing) existing.remove()

    this.canvas = document.createElement("canvas")
    this.canvas.className = "black-hole-webgl-canvas"
    this.canvas.style.position = "fixed"
    this.canvas.style.top = "0"
    this.canvas.style.left = "0"
    this.canvas.style.width = "100%"
    this.canvas.style.height = "100%"
    this.canvas.style.zIndex = "-4"
    this.canvas.style.pointerEvents = "none"
    this.canvas.style.display = "none"
    this.canvasWrapper.appendChild(this.canvas)

    this.gl =
      this.canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }) ||
      this.canvas.getContext("experimental-webgl", {
        alpha: false,
        antialias: false,
      })

    this.active = false
    this.destroyed = false
    this.animationId = null
    this.time = 0
    this.mouseEnabled = true

    this.accretionColor = opts.accretionColor || "#ff5500"
    this.coreColor = opts.coreColor || "#ffcc00"
    this.whiteColor = opts.whiteColor || "#ffffff"
    this.glowColor = opts.glowColor || "#ffa200"
    this.starColor = opts.starColor || "#ffffff"
    this.intensity = Number(opts.intensity) || 1.0
    this.angle = Number(opts.angle) || 0
    this.angleRad = (this.angle * Math.PI) / 180.0
    this.celestialType = opts.celestialType || "blackHole"
    this.celestialTypeNum = this._getCelestialTypeNum(this.celestialType)

    this.rgbAccretion = this.hexToRgb(this.accretionColor)
    this.rgbCore = this.hexToRgb(this.coreColor)
    this.rgbWhite = this.hexToRgb(this.whiteColor)
    this.rgbGlow = this.hexToRgb(this.glowColor)
    this.rgbStar = this.hexToRgb(this.starColor)

    this.mouse = { x: 0.5, y: 0.5 }
    this.targetMouse = { x: 0.5, y: 0.5 }

    this.vertexShaderSource = `
      precision mediump float;
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    this.fragmentShaderSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_angle;
      uniform vec3 u_accretionColor;
      uniform vec3 u_coreColor;
      uniform vec3 u_whiteColor;
      uniform vec3 u_glowColor;
      uniform vec3 u_starColor;
      uniform float u_celestialType;
      uniform float u_intensity;

      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        v += 0.5000 * noise(p); p *= 2.02;
        v += 0.2500 * noise(p); p *= 2.03;
        v += 0.1250 * noise(p); p *= 2.01;
        return v;
      }

      float fbm4(vec2 p) {
        float v = 0.0;
        v += 0.5000 * noise(p); p *= 2.02;
        v += 0.2500 * noise(p); p *= 2.03;
        v += 0.1250 * noise(p); p *= 2.01;
        v += 0.0625 * noise(p);
        return v;
      }

      // Fast 3x3 Voronoi cellular distance for lunar impact craters
      float voronoi(vec2 p) {
        vec2 g = floor(p);
        vec2 f = fract(p);
        float d = 1.0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 lattice = vec2(float(x), float(y));
            vec2 offset = vec2(hash(g + lattice), hash(g + lattice + vec2(33.1, 71.7)));
            d = min(d, length(lattice + offset - f));
          }
        }
        return d;
      }

      // Gravitationally distorted deep starfield
      float getStars(vec2 p) {
        vec2 grid = floor(p * 36.0);
        vec2 f = fract(p * 36.0) - 0.5;
        float h = hash(grid);
        float star = 0.0;
        if (h > 0.93) {
          float size = (h - 0.93) * 16.0;
          float brightness = smoothstep(0.38, 0.0, length(f) / (size * 0.04 + 0.018));
          star = brightness * (sin(u_time * 2.2 + h * 6.28) * 0.3 + 0.7);
        }
        return star;
      }

      // High-definition circular point-source stars with diffraction spikes
      float getDiskStars(vec2 p, float density) {
        vec2 grid = floor(p * density);
        vec2 f = fract(p * density) - 0.5;
        float h = hash(grid);
        float star = 0.0;
        if (h > 0.80) {
          float d = length(f);
          float sz = (h - 0.80) * 5.0 + 0.4;
          float core = smoothstep(0.35, 0.0, d / (sz * 0.05 + 0.02));
          float halo = exp(-d * 16.0) * 0.45;
          float spikes = 0.0;
          if (h > 0.95) {
            spikes = (exp(-abs(f.x) * 35.0) * exp(-abs(f.y) * 4.0) + exp(-abs(f.y) * 35.0) * exp(-abs(f.x) * 4.0)) * 0.85;
          }
          star = (core + halo + spikes) * (sin(u_time * 2.6 + h * 6.28) * 0.25 + 0.75);
        }
        return star;
      }

      // Inward spiraling Keplerian plasma vortex flow with razor-sharp relativistic stream filaments
      float getPlasma(float theta, float r, float speedMult, float t) {
        // Continuous gravitational suction: inward radial advection along logarithmic spirals
        float suction = log(r + 0.012) * 5.8 - t * 2.2;
        float keplerSpeed = (1.0 / (pow(r, 1.25) + 0.03)) * 0.38 * speedMult;
        float flow = theta + keplerSpeed * t + suction;

        // High-contrast, sharp fibrous stream filaments (distinct ribbons of light with dark gaps)
        float s1 = pow(sin(flow * 3.0 + r * 32.0) * 0.5 + 0.5, 4.0);
        float s2 = pow(sin(flow * 8.0 - r * 70.0 + t * 2.0) * 0.5 + 0.5, 6.0);
        float s3 = pow(sin(flow * 20.0 + r * 150.0 - t * 3.0) * 0.5 + 0.5, 10.0);
        float s4 = pow(sin(flow * 48.0 - r * 300.0 + t * 4.6) * 0.5 + 0.5, 14.0);

        // Micro-groove density rings (thin, crisp caustic striations)
        float microRings = pow(sin(r * 110.0 - t * 1.5) * 0.5 + 0.5, 6.0) * 0.35
                         + pow(sin(r * 240.0 - t * 2.6) * 0.5 + 0.5, 8.0) * 0.20;

        // Multi-frequency turbulent streak clustering
        float streamCluster = (s1 * 0.65 + s2 * 0.45 + s3 * 0.30 + s4 * 0.18 + microRings);
        float streakTurbulence = noise(vec2(flow * 2.8, r * 9.0));

        return pow(clamp(streamCluster * (streakTurbulence * 0.65 + 0.65) * 1.35, 0.0, 1.0), 1.6);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y;

        // Interactive 3D Spacetime Perspective Tilt
        vec2 mouseNorm = (u_mouse - 0.5) * 2.0;
        float tiltY = clamp(mouseNorm.y * 0.18, -0.25, 0.25);
        float tiltX = clamp(mouseNorm.x * 0.18, -0.25, 0.25);

        // Center offset with mouse parallax
        vec2 p = uv - vec2(tiltX * 0.32, tiltY * 0.32);

        // Full angle rotation + mouse interactive roll
        p = rot(u_angle + tiltX * 0.2) * p;
        float r = length(p);

        // =========================================================================
        // MODE 0: Gargantua Black Hole (Hollywood AAA Relativistic Kerr Engine)
        // REVOLUTIONARY 3D GEODESIC LIGHT STREAM SIMULATION WITH TRUE DEPTH OCCLUSION
        // =========================================================================
        if (u_celestialType < 0.5) {
          float theta = atan(p.y, p.x);

          // General Relativity Schwarzschild/Kerr radii constants
          float rH = 0.168;           // Event Horizon radius (Shadow boundary)
          float rPh = rH * 1.30;      // Photon Sphere caustic ring
          float rISCO = rH * 1.65;    // Innermost Stable Circular Orbit

          // 1. Spacetime Geodesic Deflection (Gravitational Lensing)
          float deflection = (rH * rH * 1.85) / (r * r + 0.0038);
          vec2 lensedP = p * (1.0 - deflection);

          // Counter-rotate stars so celestial starfield remains unrotated relative to screen,
          // while stars curve dynamically along gravitational geodesics:
          vec2 cosmicP = rot(-u_angle) * lensedP;
          float stars = getStars(cosmicP);
          float einsteinRing = exp(-abs(r - rPh * 1.48) * 18.0) * 0.45;
          vec3 starCol = u_starColor * (stars + einsteinRing * stars * 1.35);

          // Subtle ambient cosmic nebula dust
          float nebula = (sin(cosmicP.x * 3.5 + cosmicP.y * 3.0 + u_time * 0.12) * 0.5 + 0.5) * 0.035;
          starCol += mix(u_glowColor, u_accretionColor, 0.5) * nebula * smoothstep(rH * 1.5, 0.9, r);

          // Relativistic Doppler Beaming factor - completely continuous across full 360 degrees
          float dopplerShift = p.x / (r + 0.035);
          float doppler = pow(clamp(1.0 + 1.05 * dopplerShift, 0.20, 2.6), 1.75);

          // 2. Primary Accretion Disk (Seamless 360-degree Equatorial Plane)
          float diskAspect = 0.28 + tiltY * 0.16;
          vec2 diskUV = vec2(p.x, p.y / diskAspect);
          float diskR = length(diskUV);
          float diskTheta = atan(diskUV.y, diskUV.x);

          float diskPlasma = getPlasma(diskTheta, diskR, 1.0, u_time) * doppler;
          float diskRadialMask = smoothstep(rISCO, rISCO + 0.035, diskR) * exp(-(diskR - rISCO) * 2.2);
          float diskTotal = diskRadialMask * diskPlasma;

          // 3. Gravitational Lensed Halo (Continuous unbroken lensed arch behind horizon)
          float haloAspect = 0.72 + tiltY * 0.12;
          vec2 haloUV = vec2(p.x, p.y / haloAspect);
          float haloR = length(haloUV);
          float haloTheta = atan(haloUV.y, haloUV.x);
          float haloPlasma = getPlasma(haloTheta, haloR * 1.45, 0.92, u_time) * doppler;
          float haloMask = exp(-abs(haloR - rPh * 1.35) * 13.0) * smoothstep(rPh * 0.96, rPh + 0.035, r);

          // 4. Infalling plunge streams (smooth continuous spiral)
          float plungeSpiral = sin(theta * 3.0 - log(r + 0.003) * 16.0 + u_time * 4.6);
          float plungeMask = smoothstep(rH * 0.98, rISCO, r) * exp(-abs(r - rH * 1.12) * 18.0);
          float plungeStream = pow(clamp(plungeSpiral * 0.5 + 0.5, 0.0, 1.0), 3.5) * plungeMask * 0.95;

          float spiralStream = sin(theta * 3.0 - log(r + 0.001) * 9.5 + u_time * 2.6) * 0.5 + 0.5;
          spiralStream = pow(spiralStream, 4.0) * exp(-r * 2.4) * smoothstep(rH, rISCO * 1.2, r);

          float totalPlasma = diskTotal * 1.15 + haloMask * haloPlasma * 0.90 + spiralStream * 0.45 + plungeStream * 0.75;

          // 5. Multi-Order Concentric Photon Rings
          float pr_sharp = exp(-abs(r - rPh) * 98.0) * 2.0;
          float pr_bloom = exp(-abs(r - rPh) * 22.0) * 0.85;
          float pr_inner = exp(-abs(r - rH * 1.12) * 135.0) * 1.2;
          float pr_tertiary = exp(-abs(r - rH * 1.04) * 175.0) * 0.75;
          float totalPhotonRings = pr_sharp + pr_bloom + pr_inner + pr_tertiary;

          // 6. Polar Relativistic Jets & Synchrotron Corona
          float polarDist = abs(p.x) / (abs(p.y) * 0.48 + 0.08);
          float jetSpiral = sin(u_time * 4.2 + abs(p.y) * 18.0) * 0.2 + 0.8;
          float polarJets = exp(-polarDist * 3.8) * exp(-abs(p.y) * 1.1) * jetSpiral;
          polarJets *= smoothstep(rH * 0.75, rH * 2.2, abs(p.y)) * 0.35;

          float anamorphicFlare = exp(-abs(p.y / diskAspect) * 14.0) * exp(-abs(p.x) * 1.6) * 0.28;
          float coronaGlow = exp(-abs(r - rH * 1.22) * 12.0) * 0.55;

          // 7. Color Grading & Multi-Color Blending (Accretion, Core, White Light, Glow, Star)
          vec3 hotWhite = u_whiteColor;
          vec3 glowCol = u_glowColor;

          // Blend outer accretion color into inner core color seamlessly
          float coreMix = smoothstep(rISCO * 2.4, rISCO, diskR);
          vec3 diskBaseCol = mix(u_accretionColor, u_coreColor, coreMix);

          // Brilliant plasma core with continuous, non-split Doppler thermal brightening
          vec3 plasmaCore = mix(diskBaseCol, hotWhite, clamp(totalPlasma * 0.65 + pr_sharp * 0.45, 0.0, 0.92));
          float dopplerBoost = smoothstep(0.25, -0.45, dopplerShift);
          plasmaCore = mix(plasmaCore, mix(glowCol, hotWhite, 0.70), dopplerBoost * 0.50);

          // Composite entire accretion glow without quadrant cuts
          vec3 accretionGlow = (diskBaseCol * (totalPlasma * 1.2 + anamorphicFlare)
                             + glowCol * (coronaGlow * 0.75 + polarJets * 1.1)
                             + mix(hotWhite, glowCol, 0.35) * (totalPhotonRings * 0.46)
                             + plasmaCore * totalPlasma * 0.45) * u_intensity;

          vec3 color = starCol + accretionGlow;

          // 8. Event Horizon Shadow with Continuous 3D Depth Occlusion
          // Front disk passes in front of the shadow; rear disk is cleanly occluded by singularity
          float shadow = smoothstep(rH * 0.965, rH + 0.006, r);
          float frontDiskPresence = smoothstep(0.06, -0.06, p.y / diskAspect) * smoothstep(rISCO * 0.9, rISCO * 1.3, diskR);
          float shadowComposite = mix(shadow, 1.0, frontDiskPresence * 0.85);

          color *= shadowComposite;

          // Horizon Rim Ergosphere Glow
          float horizonRim = exp(-abs(r - rH) * 85.0) * 0.40 * shadow;
          color += mix(glowCol, hotWhite, 0.65) * horizonRim * u_intensity;

          // Deep cosmic void
          vec3 cosmicBg = vec3(0.008, 0.010, 0.018);
          color = max(color, cosmicBg * shadow);

          // Cinematic vignette
          vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
          vigUv *= (1.0 - vigUv.yx);
          float vig = clamp(vigUv.x * vigUv.y * 16.0, 0.0, 1.0);
          color *= mix(0.72, 1.0, vig);

          gl_FragColor = vec4(color, 1.0);
        }

        // =========================================================================
        // MODE 1: Illustrated 2D Earth & Moon (Charming Hand-Drawn Celestial World)
        // NON-3D STYLIZED STORYBOOK ARTWORK - CLEAN CEL-SHADED ILLUSTRATION
        // =========================================================================
        else if (u_celestialType < 1.5) {
          // 1. Illustrated Cosmic Background with Twinkling Diamond Sparkles
          vec2 cosmicP = rot(-u_angle) * (uv - vec2(tiltX * 0.14, tiltY * 0.14));
          float baseStars = getStars(cosmicP);

          // Cute hand-drawn 4-point sparkle stars
          vec2 starGrid = fract(cosmicP * 14.0) - 0.5;
          vec2 starCell = floor(cosmicP * 14.0);
          float starRand = hash(starCell);
          float isSparkle = step(0.88, starRand);
          float starTwinkle = sin(u_time * 2.5 + starRand * 6.28) * 0.5 + 0.5;
          float sparkleShape = (exp(-abs(starGrid.x) * 22.0) * exp(-abs(starGrid.y) * 4.0) +
                                exp(-abs(starGrid.y) * 22.0) * exp(-abs(starGrid.x) * 4.0)) * 0.6;
          float drawnSparkles = isSparkle * sparkleShape * starTwinkle;

          vec3 starCol = u_starColor * (baseStars * 0.8 + drawnSparkles);
          // Soft illustrated dreamy nebula tint
          float dreamyNebula = (sin(cosmicP.x * 2.5 + cosmicP.y * 2.0 + u_time * 0.1) * 0.5 + 0.5) * 0.04;
          starCol += mix(vec3(0.08, 0.12, 0.28), u_glowColor, 0.35) * dreamyNebula;

          vec3 color = starCol;

          // 2. Delicate Dotted Moon Orbit Path
          float orbitA = 0.58;
          float orbitB = 0.24;
          vec2 orbitCoord = vec2(p.x / orbitA, p.y / orbitB);
          float orbitDist = abs(length(orbitCoord) - 1.0);
          float orbitDot = sin(atan(orbitCoord.y, orbitCoord.x) * 36.0);
          float orbitLine = exp(-orbitDist * 85.0) * smoothstep(-0.2, 0.4, orbitDot) * 0.15;
          color += mix(u_glowColor, vec3(0.7, 0.85, 1.0), 0.5) * orbitLine;

          // 3. Illustrated Earth (2D Hand-drawn Planet Disc)
          float earthR = 0.28;
          float earthDist = r;

          // Sun light direction for 2D cel-shading
          vec2 sunDir2D = normalize(vec2(-0.72, 0.55));

          if (earthDist < earthR) {
            // Planar illustrated coordinates with smooth drift
            vec2 flatCoord = vec2(p.x * 2.1 + u_time * 0.035, p.y * 2.2);

            // Illustrated Continent Landmasses (Stylized vector shapes)
            vec2 warp = vec2(fbm(flatCoord + vec2(1.7, 3.2)), fbm(flatCoord + vec2(4.3, 6.1))) * 0.42;
            vec2 continentUV = flatCoord + warp;
            float landNoise = fbm4(continentUV);

            // Clean stepped thresholds for illustrated hand-drawn feel
            float isOceanShallow = smoothstep(0.44, 0.48, landNoise);
            float isLand = smoothstep(0.48, 0.52, landNoise);
            float isHighland = smoothstep(0.60, 0.68, landNoise);

            // Stylized Polar Ice Caps (Cute hand-drawn rounded wavy caps)
            float poleWavy = sin(flatCoord.x * 8.0 + u_time * 0.04) * 0.025;
            float isPolarCap = smoothstep(earthR * 0.72, earthR * 0.84, abs(p.y) + poleWavy);

            // Hand-drawn Ocean Palette (Deep vibrant marine with shallow turquoise contour rim)
            vec3 deepOcean = vec3(0.09, 0.22, 0.44);
            vec3 shallowWater = vec3(0.18, 0.58, 0.68);
            vec3 wavePattern = vec3(0.04, 0.08, 0.12) * sin(continentUV.x * 24.0 + continentUV.y * 18.0);
            vec3 oceanCol = mix(deepOcean, shallowWater, isOceanShallow) + wavePattern * (1.0 - isLand);

            // Hand-drawn Land Palette (Emerald green, warm sand coastlines, sage highland)
            vec3 beachSand = vec3(0.92, 0.82, 0.55);
            vec3 lushLand = vec3(0.18, 0.65, 0.32);
            vec3 highland = vec3(0.38, 0.72, 0.28);
            vec3 landCol = mix(beachSand, lushLand, smoothstep(0.48, 0.54, landNoise));
            landCol = mix(landCol, highland, isHighland);

            // Stylized 2D Ice Caps
            vec3 iceCapCol = vec3(0.94, 0.97, 1.0);

            // Surface composite before clouds
            vec3 surfaceCol = mix(oceanCol, landCol, isLand);
            surfaceCol = mix(surfaceCol, iceCapCol, isPolarCap);

            // Stylized 2D Drifting Clouds (Soft puffy hand-drawn cloud bands)
            vec2 cloudUV = vec2(p.x * 2.2 + u_time * 0.052, p.y * 2.4);
            vec2 cloudWarp = vec2(fbm(cloudUV * 1.3), fbm(cloudUV * 1.3 + 2.5)) * 0.3;
            float cloudShape = smoothstep(0.46, 0.66, fbm4(cloudUV + cloudWarp));

            // Cute 2D paper-cut drop shadow cast by clouds onto surface
            vec2 shadowOffset = -sunDir2D * 0.016;
            vec2 shadowUV = cloudUV + shadowOffset;
            float cloudShadow = smoothstep(0.46, 0.66, fbm4(shadowUV + cloudWarp));
            surfaceCol = mix(surfaceCol, surfaceCol * 0.62, cloudShadow * 0.65 * (1.0 - cloudShape));

            // Layer clouds on top
            vec3 cloudCol = vec3(0.98, 0.99, 1.0);
            surfaceCol = mix(surfaceCol, cloudCol, cloudShape * 0.95);

            // 2D Cel-Shaded Day / Night Lighting (Anime / Ghibli / Storybook style)
            float sunDot = dot(p, sunDir2D);
            float celDay = smoothstep(-0.06, 0.08, sunDot);

            // Night side palette (deep cozy indigo with warm village light sparkles)
            vec3 nightBase = surfaceCol * vec3(0.08, 0.12, 0.24);
            float townNoise = noise(continentUV * 28.0);
            float townLights = smoothstep(0.68, 0.85, townNoise) * isLand * (1.0 - cloudShape) * (1.0 - isPolarCap);
            vec3 cozyLights = vec3(1.0, 0.82, 0.35) * townLights * 1.8;
            vec3 nightCol = nightBase + cozyLights;

            // Warm twilight pencil stroke at terminator boundary
            float termLine = exp(-sunDot * sunDot * 160.0);
            vec3 twilightStroke = vec3(1.0, 0.58, 0.25) * termLine * 0.85;

            vec3 drawnPlanet = mix(nightCol, surfaceCol, celDay) + twilightStroke;

            // Inner illustrated contour shadow
            float innerRim = smoothstep(earthR * 0.6, earthR, earthDist);
            drawnPlanet *= mix(1.0, 0.72, innerRim * (1.0 - celDay * 0.5));

            // Anti-aliased outer edge of the Earth disc
            float edgeAlpha = smoothstep(earthR, earthR - 0.003, earthDist);
            color = mix(color, drawnPlanet, edgeAlpha);
          }

          // 4. Illustrated Atmospheric Outer Halo & Hand-Drawn Outer Contour
          float atmoRim = exp(-abs(earthDist - earthR) * 45.0) * 0.85;
          float outerGlow = exp(-max(0.0, earthDist - earthR) * 16.0) * 0.45;
          float sunSide = max(0.0, dot(normalize(p), sunDir2D));
          vec3 atmoOutline = mix(vec3(0.25, 0.70, 0.98), u_glowColor, 0.35);
          color += atmoOutline * (atmoRim + outerGlow) * (sunSide * 0.6 + 0.4) * smoothstep(earthR * 0.92, earthR * 1.35, earthDist);

          // 5. Illustrated Orbiting Moon ("Mặt trăng vẽ thủ công")
          float mAngle = u_time * 0.24 + 1.2;
          vec2 moonPos = vec2(cos(mAngle) * 0.58, sin(mAngle) * 0.24);
          float moonDist = length(p - moonPos);
          float moonR = 0.046;

          if (moonDist < moonR) {
            vec2 mLocal = (p - moonPos) / moonR;

            // Illustrated Craters (Charming hand-drawn circular craters)
            float cr1 = length(mLocal - vec2(0.22, 0.18)) - 0.28;
            float crRing1 = smoothstep(0.04, 0.0, abs(cr1)) * 0.45;
            float crFill1 = smoothstep(0.0, -0.04, cr1) * 0.22;

            float cr2 = length(mLocal - vec2(-0.25, -0.22)) - 0.34;
            float crRing2 = smoothstep(0.04, 0.0, abs(cr2)) * 0.40;
            float crFill2 = smoothstep(0.0, -0.04, cr2) * 0.20;

            float cr3 = length(mLocal - vec2(-0.15, 0.32)) - 0.18;
            float crRing3 = smoothstep(0.03, 0.0, abs(cr3)) * 0.42;
            float crFill3 = smoothstep(0.0, -0.03, cr3) * 0.20;

            vec3 moonBase = vec3(0.92, 0.91, 0.88);
            vec3 craterDark = vec3(0.68, 0.66, 0.64);
            vec3 moonSurface = mix(moonBase, craterDark, max(crFill1, max(crFill2, crFill3)));
            moonSurface = mix(moonSurface, craterDark * 0.8, max(crRing1, max(crRing2, crRing3)));

            // 2D Cel-shade on Moon
            float mSunDot = dot(p - moonPos, sunDir2D);
            float mCelDay = smoothstep(-0.01, 0.015, mSunDot);
            vec3 moonNight = moonSurface * vec3(0.22, 0.24, 0.32);
            vec3 drawnMoon = mix(moonNight, moonSurface, mCelDay);

            float mEdge = smoothstep(moonR, moonR - 0.0028, moonDist);
            color = mix(color, drawnMoon, mEdge);
          }

          // Gentle outer halo around moon
          float moonHalo = exp(-abs(moonDist - moonR) * 42.0) * 0.45 * smoothstep(moonR * 0.9, moonR * 1.5, moonDist);
          color += vec3(0.85, 0.88, 0.95) * moonHalo;

          // Deep cosmic void & subtle vignette
          vec3 cosmicBg = vec3(0.010, 0.012, 0.022);
          color = max(color, cosmicBg);

          vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
          vigUv *= (1.0 - vigUv.yx);
          float vig = clamp(vigUv.x * vigUv.y * 16.0, 0.0, 1.0);
          color *= mix(0.75, 1.0, vig);

          gl_FragColor = vec4(color, 1.0);
        // =========================================================================
        // MODE 2: Spiral Galaxy 3D (Hollywood AAA Cosmic Density Wave & HDR Bulge)
        // DIRECTLY SHARING BLACK HOLE RELATIVISTIC PLASMA, DOPPLER BEAMING & CAUSTICS
        // =========================================================================
        } else {
          // 1. Spacetime Starfield & Cosmic Nebula (identical to Mode 0)
          vec2 cosmicP = rot(-u_angle) * (uv - vec2(tiltX * 0.14, tiltY * 0.14));
          float stars = getStars(cosmicP);
          vec3 starCol = u_starColor * stars;
          float nebula = (sin(cosmicP.x * 3.5 + cosmicP.y * 3.0 + u_time * 0.12) * 0.5 + 0.5) * 0.035;
          starCol += mix(u_glowColor, u_accretionColor, 0.5) * nebula;

          // 2. 3D Inclined Galactic Disk Projection
          float galAspect = 0.32 + tiltY * 0.18;
          vec2 diskUV = vec2(p.x, p.y / galAspect);
          float galR = length(diskUV);
          float galTheta = atan(diskUV.y, diskUV.x);

          // 3. Galactic Keplerian Plasma Advection & Differential Density Wave (Mode 0 getPlasma Engine)
          float diskPlasma = getPlasma(galTheta, galR * 0.85, 0.75, u_time * 0.35);

          // Multi-harmonic Logarithmic Density Wave Spiral Arms
          float spiralPhase = galTheta - u_time * 0.12 + log(galR + 0.02) * 4.25;
          float arm1 = pow(cos(spiralPhase * 2.0) * 0.5 + 0.5, 2.6);
          float arm2 = pow(cos(spiralPhase * 4.0 - 0.75) * 0.5 + 0.5, 3.4) * 0.42;
          float arm3 = pow(cos(spiralPhase * 6.0 + 1.2) * 0.5 + 0.5, 4.0) * 0.22;
          float armTotal = arm1 + arm2 + arm3;

          // Combined Inflowing Plasma and Galactic Arms
          float totalGalacticPlasma = diskPlasma * armTotal;

          // 4. Relativistic Doppler Beaming (approaching side on left is boosted - Mode 0 exact formulation)
          float doppler = pow(max(1.0 + 0.95 * (p.x / (r + 0.025)), 0.18), 1.65);
          totalGalacticPlasma *= doppler;

          // Interstellar Cold Dark Dust Absorption Lanes (backlit silhouettes along arm rims)
          float dustPhase = sin(spiralPhase * 2.0 - 0.45);
          float dustFractal = fbm(vec2(galR * 18.0 - u_time * 0.04, galTheta * 4.8));
          float dustMask = smoothstep(0.18, 0.78, dustPhase) * dustFractal;
          float dustExtinction = mix(1.0, 0.16, dustMask * smoothstep(0.05, 0.58, galR));

          // Young Hot Stellar Population (Electric Sapphire & Cyan OB Associations)
          float armFalloff = smoothstep(0.96, 0.07, galR) * smoothstep(0.02, 0.22, galR);
          float armGlow = totalGalacticPlasma * armFalloff * dustExtinction;
          vec3 youngStars = mix(vec3(0.32, 0.75, 1.0), u_accretionColor, 0.32) * armGlow * 2.2;

          // Authentic Multi-Layer Stellar Population (Eliminates square block artifacts)
          float microStars = getDiskStars(diskUV, 65.0) * 0.95;
          float giantStars = getDiskStars(diskUV, 26.0) * 1.85;
          float starHaze = fbm(diskUV * 16.0) * 0.40 + fbm(diskUV * 32.0) * 0.20;
          vec3 starClusters = u_starColor * (microStars + giantStars + starHaze * 0.35) * armTotal * armFalloff * 1.6;

          // H II Starburst Giant Emission Nebulae (Ionized Hydrogen knots: ruby, magenta, coral)
          float hIIKnot = pow(max(0.0, sin(spiralPhase * 2.0 + 0.32)), 11.0) * fbm(vec2(galR * 32.0, galTheta * 7.5));
          hIIKnot *= smoothstep(0.07, 0.65, galR) * smoothstep(0.88, 0.38, galR);
          vec3 hIINebulae = mix(vec3(1.0, 0.18, 0.48), u_glowColor, 0.28) * hIIKnot * 3.4;

          // 5. Active Galactic Nucleus (AGN) & Concentric Caustic Photon Rings (Mode 0 exact formulation)
          float core_sharp = exp(-abs(galR - 0.035) * 98.0) * 2.0;    // Nuclear photon sphere ring
          float core_bloom = exp(-abs(galR - 0.035) * 22.0) * 1.1;    // Nuclear caustic halo
          float core_bulge = exp(-galR * 7.2) * 2.5;                  // Supermassive Population II bulge
          float core_halo = exp(-galR * 2.6) * 0.95;                  // Extended galactic corona
          float totalCoreCaustics = core_sharp + core_bloom + core_bulge + core_halo;

          // 6. Polar Relativistic Jets & Synchrotron Corona (Mode 0 magnetic pole formulation)
          float polarDist = abs(p.x) / (abs(p.y) * 0.46 + 0.08);
          float jetSpiral = sin(u_time * 3.8 + abs(p.y) * 16.0) * 0.2 + 0.8;
          float polarJets = exp(-polarDist * 3.8) * exp(-abs(p.y) * 1.1) * jetSpiral;
          polarJets *= smoothstep(0.04, 0.45, abs(p.y)) * 0.55;

          float anamorphicFlare = exp(-abs(p.y / galAspect) * 15.0) * exp(-abs(p.x) * 1.6) * 0.35;
          float coronaGlow = exp(-abs(galR - 0.08) * 12.0) * 0.65;

          // 7. Thermal Gradient & Dual-Palette Color Engine (Mode 0 formulation)
          vec3 hotWhite = u_whiteColor;
          vec3 glowCol = u_glowColor;
          float galCoreMix = exp(-galR * 4.5);
          vec3 diskBaseCol = mix(u_accretionColor, u_coreColor, galCoreMix);
          vec3 plasmaCore = mix(diskBaseCol, hotWhite, clamp(totalGalacticPlasma * 0.65 + core_sharp * 0.45, 0.0, 0.92));

          // Continuous relativistic blueshift without axis split
          float galDopplerShift = p.x / (galR + 0.04);
          float galBlueFactor = smoothstep(0.20, -0.40, galDopplerShift);
          plasmaCore = mix(plasmaCore, glowCol, galBlueFactor * 0.45);

          // Galactic glow composite with customizable glowCol for jets, corona, and core caustics
          vec3 galaxyGlow = (diskBaseCol * (totalGalacticPlasma * 1.2 + anamorphicFlare)
                          + glowCol * (coronaGlow * 0.65 + polarJets * 1.1)
                          + mix(hotWhite, glowCol, 0.4) * (totalCoreCaustics * 0.45)
                          + youngStars + starClusters + hIINebulae) * u_intensity;

          vec3 color = starCol + galaxyGlow;

          // Deep cosmic void (Mode 0 exact formulation)
          vec3 cosmicBg = vec3(0.008, 0.010, 0.018);
          color = max(color, cosmicBg);

          // Cinematic vignette (Mode 0 exact formulation)
          vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
          vigUv *= (1.0 - vigUv.yx);
          float vig = clamp(vigUv.x * vigUv.y * 16.0, 0.0, 1.0);
          color *= mix(0.72, 1.0, vig);

          gl_FragColor = vec4(color, 1.0);
        }
      }
    `

    this._handleMouseMove = this._handleMouseMove.bind(this)
    this._handleResize = this._handleResize.bind(this)
    this._handleVisibility = this._handleVisibility.bind(this)
  }

  hexToRgb(hex) {
    let clean = (hex || "#ff5500").replace("#", "")
    if (clean.length === 3) {
      clean = clean
        .split("")
        .map((c) => c + c)
        .join("")
    }
    const num = parseInt(clean, 16) || 0
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255,
    ]
  }

  setMouseEnabled(enabled) {
    this.mouseEnabled = Boolean(enabled)
    if (!this.mouseEnabled) {
      this.targetMouse = { x: 0.5, y: 0.5 }
      this.mouse = { x: 0.5, y: 0.5 }
    }
  }

  _getCelestialTypeNum(type) {
    if (type === "earth") {
      return 1.0
    }
    if (type === "galaxy") {
      return 2.0
    }
    return 0.0
  }

  updateCelestialType(type) {
    this.celestialType = type || "blackHole"
    this.celestialTypeNum = this._getCelestialTypeNum(this.celestialType)
  }

  updateAngle(deg) {
    this.angle = Number(deg) || 0
    this.angleRad = (this.angle * Math.PI) / 180.0
  }

  updateColor(type, color) {
    if (type === "accretion") {
      this.accretionColor = color
      this.rgbAccretion = this.hexToRgb(color)
    } else if (type === "core") {
      this.coreColor = color
      this.rgbCore = this.hexToRgb(color)
    } else if (type === "white" || type === "highlight") {
      this.whiteColor = color
      this.rgbWhite = this.hexToRgb(color)
    } else if (type === "glow" || type === "corona") {
      this.glowColor = color
      this.rgbGlow = this.hexToRgb(color)
    } else if (type === "star") {
      this.starColor = color
      this.rgbStar = this.hexToRgb(color)
    }
  }

  updateIntensity(val) {
    this.intensity = Number(val) || 1.0
  }

  setOptions(opts = {}) {
    if (opts.accretionColor !== undefined) {
      this.updateColor("accretion", opts.accretionColor)
    }
    if (opts.coreColor !== undefined) {
      this.updateColor("core", opts.coreColor)
    }
    if (opts.whiteColor !== undefined) {
      this.updateColor("white", opts.whiteColor)
    }
    if (opts.glowColor !== undefined) {
      this.updateColor("glow", opts.glowColor)
    }
    if (opts.starColor !== undefined) {
      this.updateColor("star", opts.starColor)
    }
    if (opts.intensity !== undefined) {
      this.updateIntensity(opts.intensity)
    }
    if (opts.angle !== undefined) {
      this.updateAngle(opts.angle)
    }
    if (opts.celestialType !== undefined) {
      this.updateCelestialType(opts.celestialType)
    }
    if (opts.mouseEnabled !== undefined) {
      this.setMouseEnabled(opts.mouseEnabled)
    }
  }

  initWebGL() {
    if (!this.gl) return false
    const gl = this.gl

    const compileShader = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("BlackHole Shader error:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compileShader(gl.VERTEX_SHADER, this.vertexShaderSource)
    const fs = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource)
    if (!vs || !fs) return false

    this.program = gl.createProgram()
    gl.attachShader(this.program, vs)
    gl.attachShader(this.program, fs)
    gl.linkProgram(this.program)

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error("BlackHole Link error:", gl.getProgramInfoLog(this.program))
      return false
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    this.posLocation = gl.getAttribLocation(this.program, "position")
    gl.enableVertexAttribArray(this.posLocation)
    gl.vertexAttribPointer(this.posLocation, 2, gl.FLOAT, false, 0, 0)

    this.uResLoc = gl.getUniformLocation(this.program, "u_resolution")
    this.uTimeLoc = gl.getUniformLocation(this.program, "u_time")
    this.uMouseLoc = gl.getUniformLocation(this.program, "u_mouse")
    this.uAngleLoc = gl.getUniformLocation(this.program, "u_angle")
    this.uAccretionLoc = gl.getUniformLocation(this.program, "u_accretionColor")
    this.uCoreLoc = gl.getUniformLocation(this.program, "u_coreColor")
    this.uWhiteLoc = gl.getUniformLocation(this.program, "u_whiteColor")
    this.uGlowLoc = gl.getUniformLocation(this.program, "u_glowColor")
    this.uStarLoc = gl.getUniformLocation(this.program, "u_starColor")
    this.uCelestialLoc = gl.getUniformLocation(this.program, "u_celestialType")
    this.uIntensityLoc = gl.getUniformLocation(this.program, "u_intensity")

    return true
  }

  _handleResize() {
    if (!this.canvas) return
    const w = window.innerWidth
    const h = window.innerHeight

    // Native High-DPI Retina Subpixel Rendering for razor-sharp HD visuals
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  _handleMouseMove(e) {
    if (this.mouseEnabled === false) return
    this.targetMouse.x = e.clientX / window.innerWidth
    this.targetMouse.y = 1.0 - e.clientY / window.innerHeight
  }

  _handleVisibility() {
    if (document.hidden) {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
    } else if (this.active && !this.animationId) {
      this.lastFrameTime = performance.now()
      this._renderLoop()
    }
  }

  start() {
    if (this.active || this.destroyed) return
    this.active = true
    this.canvas.style.display = "block"

    if (!this.program && !this.initWebGL()) return

    this._handleResize()
    window.addEventListener("resize", this._handleResize)
    window.addEventListener("mousemove", this._handleMouseMove, { passive: true })
    document.addEventListener("visibilitychange", this._handleVisibility)

    this.lastFrameTime = performance.now()
    this._renderLoop()
  }

  _renderLoop() {
    if (!this.active || this.destroyed) return

    const now = performance.now()
    const dt = Math.min((now - (this.lastFrameTime || now)) * 0.001, 0.1)
    this.lastFrameTime = now
    this.time += dt

    // Smooth mouse lerp
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.06
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.06

    const gl = this.gl
    gl.useProgram(this.program)

    gl.uniform2f(this.uResLoc, this.canvas.width, this.canvas.height)
    gl.uniform1f(this.uTimeLoc, this.time)
    gl.uniform2f(this.uMouseLoc, this.mouse.x, this.mouse.y)
    gl.uniform1f(this.uAngleLoc, this.angleRad)
    gl.uniform3f(
      this.uAccretionLoc,
      this.rgbAccretion[0],
      this.rgbAccretion[1],
      this.rgbAccretion[2],
    )
    gl.uniform3f(
      this.uCoreLoc,
      this.rgbCore[0],
      this.rgbCore[1],
      this.rgbCore[2],
    )
    gl.uniform3f(
      this.uWhiteLoc,
      this.rgbWhite[0],
      this.rgbWhite[1],
      this.rgbWhite[2],
    )
    gl.uniform3f(
      this.uGlowLoc,
      this.rgbGlow[0],
      this.rgbGlow[1],
      this.rgbGlow[2],
    )
    gl.uniform3f(
      this.uStarLoc,
      this.rgbStar[0],
      this.rgbStar[1],
      this.rgbStar[2],
    )
    gl.uniform1f(this.uCelestialLoc, this.celestialTypeNum ?? 0.0)
    gl.uniform1f(this.uIntensityLoc, this.intensity ?? 1.0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    this.animationId = requestAnimationFrame(() => this._renderLoop())
  }

  stop() {
    if (!this.active) return
    this.active = false
    this.canvas.style.display = "none"

    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    window.removeEventListener("resize", this._handleResize)
    window.removeEventListener("mousemove", this._handleMouseMove)
    document.removeEventListener("visibilitychange", this._handleVisibility)

    if (this.gl) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    }
  }

  destroy() {
    this.stop()
    this.destroyed = true
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
      this.program = null
    }
    if (this.gl && this.buffer) {
      this.gl.deleteBuffer(this.buffer)
      this.buffer = null
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
  }
}
