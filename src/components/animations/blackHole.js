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
    this.glowColor = opts.glowColor || "#00d2ff"
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

          // Brilliant plasma core with continuous, non-split Doppler blueshift
          vec3 plasmaCore = mix(diskBaseCol, hotWhite, clamp(totalPlasma * 0.65 + pr_sharp * 0.45, 0.0, 0.92));
          float blueFactor = smoothstep(0.25, -0.45, dopplerShift);
          plasmaCore = mix(plasmaCore, glowCol, blueFactor * 0.45);

          // Composite entire accretion glow without quadrant cuts
          vec3 accretionGlow = (diskBaseCol * (totalPlasma * 1.2 + anamorphicFlare)
                             + glowCol * (coronaGlow * 0.65 + polarJets * 1.1)
                             + mix(hotWhite, glowCol, 0.4) * (totalPhotonRings * 0.42)
                             + plasmaCore * totalPlasma * 0.4) * u_intensity;

          vec3 color = starCol + accretionGlow;

          // 8. Event Horizon Shadow with Continuous 3D Depth Occlusion
          // Front disk passes in front of the shadow; rear disk is cleanly occluded by singularity
          float shadow = smoothstep(rH * 0.965, rH + 0.006, r);
          float frontDiskPresence = smoothstep(0.06, -0.06, p.y / diskAspect) * smoothstep(rISCO * 0.9, rISCO * 1.3, diskR);
          float shadowComposite = mix(shadow, 1.0, frontDiskPresence * 0.85);

          color *= shadowComposite;

          // Horizon Rim Ergosphere Glow
          float horizonRim = exp(-abs(r - rH) * 85.0) * 0.40 * shadow;
          color += mix(glowCol, hotWhite, 0.55) * horizonRim * u_intensity;

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
        // MODE 1: 3D Earth & Moon (Hollywood AAA Blue Marble & Selene Masterpiece)
        // UNIFIED WITH BLACK HOLE HIGH-PRECISION CAUSTICS, ANAMORPHIC FLARES & REDSHIFT
        // =========================================================================
        else if (u_celestialType < 1.5) {
          // 1. Spacetime Starfield & Cosmic Nebula (identical to Mode 0)
          vec2 cosmicP = rot(-u_angle) * (uv - vec2(tiltX * 0.14, tiltY * 0.14));
          float stars = getStars(cosmicP);
          vec3 starCol = u_starColor * stars;
          float nebula = (sin(cosmicP.x * 3.5 + cosmicP.y * 3.0 + u_time * 0.12) * 0.5 + 0.5) * 0.035;
          starCol += mix(u_glowColor, u_accretionColor, 0.5) * nebula;

          vec3 color = starCol;

          // Planetary Constants
          float earthR = 0.285;
          float earthDist = r;

          // Directional Sunlight vector
          vec3 sunDir = normalize(vec3(-0.72, 0.52, 0.62));
          vec3 viewDir = vec3(0.0, 0.0, 1.0);

          // Ray-Sphere Analytical Intersection
          if (earthDist < earthR) {
            float z = sqrt(max(0.0, earthR * earthR - earthDist * earthDist));
            vec3 normal = vec3(p / earthR, z / earthR);

            // Planetary spherical coordinates with axial rotation
            float lon = atan(normal.x, normal.z) + u_time * 0.055;
            float lat = asin(clamp(normal.y, -1.0, 1.0));
            vec2 sphereCoord = vec2(lon * 2.4, lat * 3.0);

            // Domain-warping for natural, realistic continental landmasses
            vec2 warp = vec2(fbm(sphereCoord + vec2(1.2, 3.4)), fbm(sphereCoord + vec2(5.6, 7.8))) * 0.45;
            vec2 p_warp = sphereCoord + warp;

            // Multi-octave Land vs Ocean mask
            float landElev = fbm4(p_warp);
            float isLand = smoothstep(0.48, 0.53, landElev);
            float isShelf = smoothstep(0.43, 0.48, landElev);

            // Topographic Relief (3D Mountain Bump)
            vec2 dE = vec2(0.018, 0.0);
            float elevR = fbm4(p_warp + dE.xy);
            float elevU = fbm4(p_warp + dE.yx);
            vec3 bumpNorm = normalize(normal + vec3((landElev - elevR) * 2.5, (landElev - elevU) * 2.5, 0.0) * isLand);

            // Polar Ice Caps
            float polarCap = smoothstep(0.65, 0.82, abs(normal.y) + fbm(p_warp * 3.0) * 0.08);

            // Elevated Dynamic Cloud Deck with cyclone eye
            vec2 cloudCoord = vec2(lon * 2.6 + u_time * 0.028, lat * 3.2);
            vec2 cloudWarp = vec2(fbm(cloudCoord * 1.5), fbm(cloudCoord * 1.5 + 3.1)) * 0.35;
            float clouds = smoothstep(0.48, 0.75, fbm4(cloudCoord + cloudWarp));
            float cyclone = exp(-length(cloudCoord - vec2(u_time * 0.08, 0.4)) * 3.8);
            clouds = clamp(clouds + cyclone * 0.45, 0.0, 1.0);

            // Solar Diffuse Lighting with Topographic Relief
            float sunDiffuse = dot(bumpNorm, sunDir);
            float dayFactor = smoothstep(-0.12, 0.18, sunDiffuse);

            // Ocean colors (deep navy abyss to luminous turquoise coastal shelf)
            vec3 deepOcean = vec3(0.010, 0.11, 0.30);
            vec3 shelfOcean = vec3(0.028, 0.48, 0.72);
            vec3 oceanCol = mix(deepOcean, shelfOcean, isShelf);

            // Terrestrial biome colors
            vec3 rainforest = mix(vec3(0.08, 0.36, 0.12), u_accretionColor * 0.55, 0.22);
            vec3 savanna = vec3(0.56, 0.48, 0.24);
            vec3 mountainSnow = vec3(0.92, 0.94, 0.98);
            float elevNoise = fbm(p_warp * 4.5);
            vec3 landCol = mix(rainforest, savanna, elevNoise);
            landCol = mix(landCol, mountainSnow, smoothstep(0.62, 0.80, elevNoise));

            vec3 daySurface = mix(oceanCol, landCol, isLand);
            daySurface = mix(daySurface, vec3(0.96, 0.98, 1.0), polarCap);

            // Blinn-Phong Specular Sun Glint + Fresnel
            vec3 halfVec = normalize(sunDir + viewDir);
            float nDotH = max(0.0, dot(normal, halfVec));
            float fresnel = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(normal, viewDir)), 5.0);
            float specTight = pow(nDotH, 96.0) * 4.8;
            float specBroad = pow(nDotH, 18.0) * 0.85;
            float oceanSpec = (specTight + specBroad) * fresnel * (1.0 - isLand) * (1.0 - clouds) * (1.0 - polarCap);
            daySurface += u_whiteColor * oceanSpec * u_intensity;

            // Anamorphic Solar Lens Flare across ocean reflection (Mode 0 style)
            vec2 specProj = vec2(dot(p, vec2(-sunDir.y, sunDir.x)), dot(p, sunDir.xy));
            float sunAnamorphic = exp(-abs(specProj.x) * 18.0) * exp(-abs(specProj.y - earthR * 0.35) * 6.0) * oceanSpec * 0.45;
            daySurface += u_whiteColor * sunAnamorphic * u_intensity;

            // Cloud Drop Shadows cast onto Earth surface
            vec2 shadowOffset = -sunDir.xy * 0.042;
            float cloudShadow = smoothstep(0.48, 0.72, fbm4(cloudCoord + shadowOffset + cloudWarp));
            daySurface *= mix(1.0, 0.35, cloudShadow * dayFactor);

            // Composite Cloud Deck
            float cloudDiffuse = clamp(dot(normal, sunDir) * 1.1 + 0.1, 0.0, 1.0);
            vec3 cloudColor = mix(vec3(0.94, 0.97, 1.0), vec3(1.0, 0.98, 0.92), dayFactor) * cloudDiffuse;
            daySurface = mix(daySurface, cloudColor, clouds * 0.92);

            // Night Hemisphere: HD Metropolitan Clusters & Highway Web
            float cityDensity = pow(fbm(p_warp * 9.0), 3.4) * isLand * 3.8;
            float cityGrid = smoothstep(0.45, 0.85, noise(p_warp * 32.0)) * cityDensity;
            vec3 cityColor = mix(vec3(1.0, 0.74, 0.28), u_starColor, 0.35);
            vec3 nightLights = cityColor * (cityDensity + cityGrid * 1.6) * (1.0 - clouds * 0.65) * (1.0 - polarCap);
            vec3 airGlow = vec3(0.02, 0.08, 0.04) * pow(1.0 - normal.z, 2.5);
            vec3 nightSurface = mix(vec3(0.002, 0.004, 0.012) + airGlow, nightLights, step(0.05, cityDensity));

            // Composite Day and Night Surfaces with smooth terminator shading
            vec3 earthSurface = mix(nightSurface, daySurface * max(0.03, sunDiffuse), dayFactor);

            // Atmospheric Rayleigh Scattering Rim (Dual-layer Cyan-Blue Haze)
            float rim = pow(1.0 - normal.z, 3.0);
            vec3 rayleighColor = mix(vec3(0.16, 0.62, 1.0), u_glowColor, 0.42);
            earthSurface += rayleighColor * rim * (dayFactor * 0.88 + 0.12) * 1.35;

            // Terminator Sunset / Sunrise Twilight Ribbon (Mode 0 thermal redshift gradient)
            vec3 redshiftRim = vec3(u_accretionColor.r * 0.95, u_accretionColor.g * 0.32, u_accretionColor.b * 0.05);
            float termBand = exp(-sunDiffuse * sunDiffuse * 42.0) * rim;
            vec3 twilightCol = mix(redshiftRim, vec3(1.0, 0.75, 0.20), clamp(sunDiffuse + 0.5, 0.0, 1.0));
            earthSurface += twilightCol * termBand * 1.25;

            // Subpixel smooth anti-aliased edge
            float bodyAlpha = smoothstep(earthR, earthR - 0.0032, earthDist);
            color = mix(color, earthSurface, bodyAlpha);
          }

          // High-Order Atmospheric Caustic Shells (Mode 0 Photon Sphere Equations)
          float atmo_sharp = exp(-abs(earthDist - earthR) * 96.0) * 0.95;  // Crisp troposphere limb
          float atmo_bloom = exp(-abs(earthDist - earthR) * 24.0) * 0.65;  // Rayleigh scattering halo
          float atmo_outer = exp(-abs(earthDist - earthR) * 12.0) * 0.28;  // Exosphere purple-cyan bloom
          float totalAtmoCaustics = atmo_sharp + atmo_bloom + atmo_outer;

          // Solar forward scattering (brighter towards sun direction)
          vec2 sunLimbDir = normalize(sunDir.xy);
          float sunAlignment = max(0.0, dot(normalize(p), sunLimbDir));
          float forwardScatter = pow(sunAlignment, 3.0) * 0.85 + 0.35;

          vec3 atmoCol = mix(vec3(0.18, 0.60, 1.0), u_glowColor, 0.45);
          color += atmoCol * totalAtmoCaustics * forwardScatter * smoothstep(earthR * 0.95, earthR * 1.25, earthDist);

          // 3D Orbiting Moon with High-Definition Crater Relief & Earthshine
          float moonOrbR = 0.56;
          float moonSpeed = 0.28;
          float mAngle = u_time * moonSpeed + 1.1;
          vec2 moonPos = vec2(cos(mAngle) * moonOrbR, sin(mAngle) * moonOrbR * 0.38);
          float moonDist = length(p - moonPos);
          float moonSz = 0.046;

          if (moonDist < moonSz) {
            float mz = sqrt(max(0.0, moonSz * moonSz - moonDist * moonDist));
            vec3 mNorm = vec3((p - moonPos) / moonSz, mz / moonSz);

            // Crater Heightfield & Normal Perturbation for 3D Topography
            vec2 mUV = mNorm.xy * 16.0;
            float cBase = voronoi(mUV);
            float cDetail = voronoi(mUV * 3.2) * 0.5;
            float craters = (cBase + cDetail) * 0.28 + 0.72;

            // Direct Sunlight on Moon
            float mSunDiffuse = dot(mNorm, sunDir);
            float mDay = smoothstep(-0.05, 0.08, mSunDiffuse);

            // Earthshine on Moon's dark hemisphere (blue light reflected from Earth)
            vec3 toEarth = normalize(vec3(-moonPos, 0.4));
            float earthshine = max(0.0, dot(mNorm, toEarth)) * 0.18;
            vec3 earthshineCol = vec3(0.12, 0.35, 0.68) * earthshine;

            // Dark Basaltic Lunar Maria vs Bright Anorthosite Highlands
            float maria = smoothstep(0.45, 0.56, fbm(mNorm.xy * 6.5));
            vec3 highlandCol = vec3(0.88, 0.87, 0.85);
            vec3 mareCol = vec3(0.42, 0.41, 0.40);
            vec3 moonAlbedo = mix(highlandCol, mareCol, maria) * craters;

            vec3 moonCol = moonAlbedo * (max(0.02, mSunDiffuse) * mDay) + earthshineCol;
            float mMask = smoothstep(moonSz, moonSz - 0.0028, moonDist);
            color = mix(color, moonCol, mMask);
          }

          // Deep cosmic void (identical to Mode 0)
          vec3 cosmicBg = vec3(0.008, 0.010, 0.018);
          color = max(color, cosmicBg);

          // Cinematic vignette (identical to Mode 0)
          vec2 vigUv = gl_FragCoord.xy / u_resolution.xy;
          vigUv *= (1.0 - vigUv.yx);
          float vig = clamp(vigUv.x * vigUv.y * 16.0, 0.0, 1.0);
          color *= mix(0.72, 1.0, vig);

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
