/**
 * FirefliesHD — Smoother, physics-based recreation of bioluminescent fireflies.
 *
 * Features:
 * - Physics-driven movement (velocity, acceleration, friction).
 * - Organic "wander" behavior using smooth angle transitions.
 * - Depth simulation (z-index) affecting size, speed, and blur.
 * - Realistic layered bioluminescent flashing.
 * - Directional orientation (body aligns with movement).
 */
export class FirefliesHD {
  constructor(canvasId, quantity = 18) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.active = false;
    this.quantity = quantity;
    this.flies = [];

    this.lastDrawTime = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.active) this._build();
  }

  _build() {
    const W = this.canvas.width;
    const H = this.canvas.height;

    this.flies = [];
    for (let i = 0; i < this.quantity; i++) {
      const z = Math.random(); // Depth factor 0 (far) to 1 (near)
      
      this.flies.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        z: z,
        
        // Physics constants
        baseSpeed: (1.2 + Math.random() * 0.8) * (0.5 + z * 0.5),
        friction: 0.98,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderChange: 0,
        
        // Flash state
        flashClock: Math.random() * 10000,
        flashPeriod: 6000 + Math.random() * 6000,
        flashDuration: 1500 + Math.random() * 1000,
        flashOpacity: 0,
        
        // Visuals
        size: (2 + z * 3) * (W / 1920), // Responsive size based on width
        hue: 55 + Math.random() * 20, // Green-yellow spectrum
        
        // Tail for motion blur feel
        history: []
      });
    }
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.lastDrawTime = performance.now();
    this._build();
    this.canvas.style.display = "block";
    this.animate(performance.now());
  }

  stop() {
    this.active = false;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.flies = [];
    this.canvas.style.display = "none";
  }

  _updateFly(fly, dt, W, H) {
    // 1. Organic Wander Force
    // Slowly change the wander angle for smooth turns
    fly.wanderChange += (Math.random() - 0.5) * 0.2;
    fly.wanderChange *= 0.9; // Dampen change
    fly.wanderAngle += fly.wanderChange;

    // Apply acceleration based on wander angle
    const ax = Math.cos(fly.wanderAngle) * 0.1;
    const ay = Math.sin(fly.wanderAngle) * 0.1;

    fly.vx += ax;
    fly.vy += ay;

    // 2. Physics Constraints
    fly.vx *= fly.friction;
    fly.vy *= fly.friction;

    // Cap speed
    const speed = Math.sqrt(fly.vx * fly.vx + fly.vy * fly.vy);
    if (speed > fly.baseSpeed) {
      fly.vx = (fly.vx / speed) * fly.baseSpeed;
      fly.vy = (fly.vy / speed) * fly.baseSpeed;
    }

    // 3. Position Update
    fly.x += fly.vx * (dt / 16);
    fly.y += fly.vy * (dt / 16);

    // 4. Screen Wrap with Margin
    const margin = 100;
    if (fly.x < -margin) fly.x = W + margin;
    if (fly.x > W + margin) fly.x = -margin;
    if (fly.y < -margin) fly.y = H + margin;
    if (fly.y > H + margin) fly.y = -margin;

    // 5. Flash Logic
    fly.flashClock += dt;
    const cyclePos = fly.flashClock % fly.flashPeriod;
    
    if (cyclePos < fly.flashDuration) {
      // Smooth bell curve for flashing using sin
      const progress = cyclePos / fly.flashDuration;
      fly.flashOpacity = Math.pow(Math.sin(progress * Math.PI), 2);
    } else {
      fly.flashOpacity = 0;
    }

    // 6. History for Motion Blur
    fly.history.push({ x: fly.x, y: fly.y });
    if (fly.history.length > 5) fly.history.shift();
  }

  _drawFly(fly) {
    const { x, y, z, size, hue, flashOpacity, vx, vy, history } = fly;
    const ctx = this.ctx;

    // Determine orientation based on velocity
    const angle = Math.atan2(vy, vx);

    ctx.save();
    ctx.translate(x, y);

    // Subtle motion blur trail
    if (history.length > 1) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw absolute coordinates
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < history.length - 1; i++) {
        const p1 = history[i];
        const p2 = history[i + 1];
        const alpha = (i / history.length) * 0.2 * (0.3 + z * 0.7);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
        ctx.lineWidth = size * 0.5;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- Glow Layers ---
    // Use "screen" for additive color
    ctx.globalCompositeOperation = "screen";

    // 1. Core Ambient (Always there, very faint)
    const ambientAlpha = (0.05 + z * 0.05);
    const ambientGlow = size * 4;
    const gradAmb = ctx.createRadialGradient(0, 0, 0, 0, 0, ambientGlow);
    gradAmb.addColorStop(0, `hsla(${hue}, 100%, 70%, ${ambientAlpha})`);
    gradAmb.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    ctx.fillStyle = gradAmb;
    ctx.beginPath();
    ctx.arc(0, 0, ambientGlow, 0, Math.PI * 2);
    ctx.fill();

    // 2. Periodic Flash Glow
    if (flashOpacity > 0.01) {
      const flashSize = size * (10 + z * 10) * flashOpacity;
      const gradFlash = ctx.createRadialGradient(0, 0, 0, 0, 0, flashSize);
      gradFlash.addColorStop(0, `hsla(${hue}, 100%, 80%, ${flashOpacity * 0.6})`);
      gradFlash.addColorStop(0.3, `hsla(${hue}, 100%, 60%, ${flashOpacity * 0.2})`);
      gradFlash.addColorStop(1, `hsla(${hue}, 100%, 40%, 0)`);
      
      ctx.fillStyle = gradFlash;
      ctx.beginPath();
      ctx.arc(0, 0, flashSize, 0, Math.PI * 2);
      ctx.fill();

      // Inner Hot Spot
      const hotSpotSize = size * 2 * flashOpacity;
      const gradHot = ctx.createRadialGradient(0, 0, 0, 0, 0, hotSpotSize);
      gradHot.addColorStop(0, `rgba(255, 255, 255, ${flashOpacity})`);
      gradHot.addColorStop(1, `hsla(${hue}, 100%, 90%, 0)`);
      ctx.fillStyle = gradHot;
      ctx.beginPath();
      ctx.arc(0, 0, hotSpotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Body Segment (The firefly itself)
    // Dark body, slightly rotated
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20, 30, 0, ${0.4 + z * 0.3})`;
    ctx.fill();

    // Small bright spot on the "tail" when flashing
    if (flashOpacity > 0.1) {
        ctx.beginPath();
        ctx.arc(-size * 0.4, 0, size * 0.5 * flashOpacity, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${flashOpacity})`;
        ctx.fill();
    }

    ctx.restore();
  }

  animate(currentTime) {
    if (!this.active) return;
    this._animId = requestAnimationFrame((t) => this.animate(t));

    const dt = currentTime - this.lastDrawTime;
    if (dt < 1) return; // Prevent division by zero or too fast updates
    this.lastDrawTime = currentTime;

    const W = this.canvas.width;
    const H = this.canvas.height;

    // Clear with slight trail effect? 
    // For "HD" feel, a pure clear is usually better if we handle trails via history
    this.ctx.clearRect(0, 0, W, H);

    for (const fly of this.flies) {
      this._updateFly(fly, dt, W, H);
      this._drawFly(fly);
    }
  }
}
