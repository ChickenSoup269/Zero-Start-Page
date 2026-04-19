export class PixelBlastEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d", { alpha: true, desynchronized: true });
    this.active = false;

    // Set default options
    this.pixelSize = 15;
    this.variant = options.variant || 'square';
    this.color = options.color || '#B497CF';
    this.speed = options.speed || 0.5;
    this.cursorRadius = options.cursorRadius || 150;
    this.enableRipples = options.enableRipples !== undefined ? options.enableRipples : true;
    this.rippleSpeed = options.rippleSpeed || 0.3;
    this.rippleThickness = options.rippleThickness || 0.1;
    this.rippleIntensityScale = options.rippleIntensityScale || 1;
    this.transparent = options.transparent !== undefined ? options.transparent : true;
    this.backgroundColor = options.backgroundColor || '#0a0a0a';

    this.time = 0;
    this.ripples = [];
    this.mouse = { x: -1000, y: -1000 };

    this.handleResize = () => this.resize();
    this.handleMouseMove = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    };
    this.handleMouseDown = (e) => {
      if (this.enableRipples && this.ripples.length < 5) {
        this.ripples.push({ x: e.clientX, y: e.clientY, radius: 0, opacity: 1 });
      }
    };

    this.shapeCanvas = document.createElement('canvas');
    this.shapeCtx = this.shapeCanvas.getContext('2d');
  }

  setOptions(options) {
    Object.keys(options).forEach(key => {
      if (this[key] !== undefined && key !== 'pixelSize') {
        this[key] = options[key];
      }
    });
    if (this.active && (options.variant || options.color)) {
      this.updateShapeCache();
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.cols = Math.ceil(this.canvas.width / this.pixelSize);
    this.rows = Math.ceil(this.canvas.height / this.pixelSize);
    this.updateShapeCache();
  }

  updateShapeCache() {
    const size = this.pixelSize * 2;
    this.shapeCanvas.width = size;
    this.shapeCanvas.height = size;
    const ctx = this.shapeCtx;
    const rgb = this.hexToRgb(this.color);
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.clearRect(0, 0, size, size);

    const halfSize = size / 2;
    const pixelHalf = this.pixelSize / 2;

    if (this.variant === 'circle') {
      ctx.beginPath();
      ctx.arc(halfSize, halfSize, pixelHalf, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.variant === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(halfSize, halfSize - pixelHalf);
      ctx.lineTo(halfSize + pixelHalf, halfSize + pixelHalf);
      ctx.lineTo(halfSize - pixelHalf, halfSize + pixelHalf);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(halfSize - pixelHalf, halfSize - pixelHalf, this.pixelSize, this.pixelSize);
    }
  }

  start() {
    if (this.active || !this.canvas) return;
    this.active = true;
    this.canvas.style.display = "block";
    this.resize();
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mousedown", this.handleMouseDown);
    this.animate();
  }

  stop() {
    this.active = false;
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mousedown", this.handleMouseDown);
    if (this.canvas) {
      this.canvas.style.display = "none";
    }
    if (this._animId) {
      cancelAnimationFrame(this._animId);
    }
  }

  animate() {
    if (!this.active) return;
    this._animId = requestAnimationFrame(() => this.animate());

    this.time += 0.015 * this.speed;
    const ctx = this.ctx;

    if (this.transparent) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ripples = this.ripples.filter(r => {
      r.radius += 10 * this.rippleSpeed;
      r.opacity -= 0.02;
      return r.opacity > 0;
    });

    const interactionRadiusSq = this.cursorRadius * this.cursorRadius;

    for (let i = 0; i < this.cols; i++) {
      const xBase = i * this.pixelSize;
      for (let j = 0; j < this.rows; j++) {
        const yBase = j * this.pixelSize;

        // Start with a base alpha of 0 for a sparse background
        let alpha = 0;
        
        // Add a subtle, sparse glittering effect for the background
        const glitter = (Math.sin(this.time * 2 + i * 0.3) + Math.cos(this.time * 1.5 + j * 0.4)) / 2;
        if (glitter > 0.95) { // Only show the very brightest sparkles
            alpha = (glitter - 0.95) * 5; // Faint glow (max ~0.25)
        }

        let x = xBase, y = yBase, scale = 1;

        // Cursor interaction
        const dx = xBase - this.mouse.x;
        const dy = yBase - this.mouse.y;
        const dSq = dx * dx + dy * dy;

        if (dSq < interactionRadiusSq) {
          const d = Math.sqrt(dSq) || 1;
          const intensity = 1 - (d / this.cursorRadius);
          const blink = Math.abs(Math.sin(this.time * 7 + i * 0.2 + j * 0.2));
          alpha += intensity * blink * 0.9;
          scale += intensity * blink * 0.5;
        }
        
        // Ripple effect
        for (const r of this.ripples) {
            const rdx = x - r.x, rdy = y - r.y;
            const rd = Math.sqrt(rdx*rdx + rdy*rdy) || 1;
            const rDiff = Math.abs(rd - r.radius);
            if (rDiff < 30 * this.rippleThickness) {
              const rf = (1 - rDiff/(30 * this.rippleThickness)) * r.opacity * this.rippleIntensityScale;
              scale += rf * 0.5;
              alpha += rf * 0.5;
            }
        }
        
        // Optimization: if pixel is invisible, don't draw it
        if (alpha <= 0) {
            continue;
        }

        ctx.globalAlpha = Math.min(1, alpha);
        const drawSize = this.pixelSize * scale;
        ctx.drawImage(this.shapeCanvas, x - (drawSize - this.pixelSize) / 2, y - (drawSize - this.pixelSize) / 2, drawSize, drawSize);
      }
    }
    ctx.globalAlpha = 1;
  }

  hexToRgb(hex) {
    if (!hex || hex.length < 4) hex = '#FFFFFF';
    const r = parseInt(hex.slice(1, 3), 16),
          g = parseInt(hex.slice(3, 5), 16),
          b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
}
