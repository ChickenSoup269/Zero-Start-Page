export class PixelBlastEffect {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d", { alpha: true, desynchronized: true });
    this.active = false;

    // Set default options
    this.pixelSize = options.pixelSize || 15;
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
    
    // New UI/UX Options
    this.liquid = options.liquid !== undefined ? options.liquid : true;
    this.liquidStrength = options.liquidStrength || 1.0;
    this.liquidRadius = options.liquidRadius || 200;
    this.liquidWobbleSpeed = options.liquidWobbleSpeed || 1.0;
    this.edgeFade = options.edgeFade || 0.2;
    this.noiseAmount = options.noiseAmount || 0.05;

    this.time = 0;
    this.lastTime = 0;
    this.ripples = [];
    this.mouse = { x: -1000, y: -1000 };

    this.handleResize = () => this.resize();
    this.handleMouseMove = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    };
    this.handleMouseDown = (e) => {
      if (this.enableRipples && this.ripples.length < 8) {
        this.ripples.push({ 
          x: e.clientX, 
          y: e.clientY, 
          radius: 0, 
          opacity: 1,
          intensity: 1.0 + Math.random() * 0.5
        });
      }
    };

    this.shapeCanvas = document.createElement('canvas');
    this.shapeCtx = this.shapeCanvas.getContext('2d');
  }

  setOptions(options) {
    Object.keys(options).forEach(key => {
        this[key] = options[key];
    });
    
    // Always update cache if these options change
    if (options.variant || options.color || options.pixelSize) {
      this.updateShapeCache();
      if (this.active && options.pixelSize) {
        this.resize(); // Re-calculate grid if size changed while active
      }
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.cols = Math.ceil(this.canvas.width / this.pixelSize) + 1;
    this.rows = Math.ceil(this.canvas.height / this.pixelSize) + 1;
    this.updateShapeCache();
  }

  updateShapeCache() {
    const size = Math.max(this.pixelSize * 3, 30); // Đảm bảo đủ không gian
    this.shapeCanvas.width = size;
    this.shapeCanvas.height = size;
    const ctx = this.shapeCtx;

    // Xóa sạch canvas đệm trước khi vẽ màu mới
    ctx.clearRect(0, 0, size, size);

    const rgb = this.hexToRgb(this.color);
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

    const center = size / 2;
    const pSize = this.pixelSize;

    ctx.save();
    ctx.translate(center, center);

    
    if (this.variant === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, pSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.variant === 'triangle') {
      ctx.beginPath();
      const h = pSize * (Math.sqrt(3) / 2);
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(pSize / 2, h / 2);
      ctx.lineTo(-pSize / 2, h / 2);
      ctx.closePath();
      ctx.fill();
    } else if (this.variant === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -pSize / 2);
      ctx.lineTo(pSize / 2, 0);
      ctx.lineTo(0, pSize / 2);
      ctx.lineTo(-pSize / 2, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-pSize / 2, -pSize / 2, pSize, pSize);
    }
    ctx.restore();
  }

  start() {
    if (this.active || !this.canvas) return;
    this.active = true;
    this.canvas.style.display = "block";
    this.lastTime = performance.now();
    this.resize();
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mousedown", this.handleMouseDown);
    this.animate(performance.now());
  }

  stop() {
    this.active = false;
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mousedown", this.handleMouseDown);
    if (this.canvas) {
      this.canvas.style.display = "none";
      const ctx = this.canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    this.ripples = [];
  }

  animate(now) {
    if (!this.active) return;
    this._animId = requestAnimationFrame((t) => this.animate(t));

    if (document.visibilityState === 'hidden') return;

    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.time += dt * this.speed;

    const ctx = this.ctx;

    if (this.transparent) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Update ripples
    this.ripples = this.ripples.filter(r => {
      r.radius += 600 * dt * this.rippleSpeed;
      r.opacity -= dt * 0.8;
      return r.opacity > 0;
    });

    const cursorRadiusSq = this.cursorRadius * this.cursorRadius;
    const liquidRadiusSq = this.liquidRadius * this.liquidRadius;
    const pSize = this.pixelSize;

    for (let i = 0; i < this.cols; i++) {
      const xBase = i * pSize;
      for (let j = 0; j < this.rows; j++) {
        const yBase = j * pSize;

        let alpha = 0;
        let x = xBase, y = yBase, scale = 1;

        // Distance to mouse
        const dx = xBase - this.mouse.x;
        const dy = yBase - this.mouse.y;
        const dSq = dx * dx + dy * dy;

        // Liquid displacement
        if (this.liquid && dSq < liquidRadiusSq) {
            const d = Math.sqrt(dSq) || 1;
            const intensity = (1 - d / this.liquidRadius) * this.liquidStrength;
            
            // Hiệu ứng đẩy khối tĩnh thay vì rung theo thời gian
            const push = 15 * intensity;
            
            x += (dx / d) * push;
            y += (dy / d) * push;
        }

        // Interaction Glow
        if (dSq < cursorRadiusSq) {
          const d = Math.sqrt(dSq) || 1;
          const intensity = 1 - (d / this.cursorRadius);
          // Bỏ biến 'blink' chạy theo thời gian
          alpha += intensity * 0.85;
          scale += intensity * 0.35;
        }
        
        // Ripples
        for (const r of this.ripples) {
            const rdx = xBase - r.x, rdy = yBase - r.y;
            const rd = Math.sqrt(rdx*rdx + rdy*rdy) || 1;
            const rDiff = Math.abs(rd - r.radius);
            const rThickness = 50 * this.rippleThickness;
            
            if (rDiff < rThickness) {
              const rf = (1 - rDiff / rThickness) * r.opacity * this.rippleIntensityScale;
              scale += rf * 0.6;
              alpha += rf * 0.7;
              
              // Ripple displacement
              if (this.liquid) {
                const push = rf * 20;
                x += (rdx / rd) * push;
                y += (rdy / rd) * push;
              }
            }
        }

        // Edge fade (vignette-like)
        if (this.edgeFade > 0) {
            const marginX = this.canvas.width * this.edgeFade;
            const marginY = this.canvas.height * this.edgeFade;
            const edgeX = Math.min(xBase, this.canvas.width - xBase) / marginX;
            const edgeY = Math.min(yBase, this.canvas.height - yBase) / marginY;
            alpha *= Math.min(1, edgeX) * Math.min(1, edgeY);
        }
        
        if (alpha <= 0.01) continue;

        ctx.globalAlpha = Math.min(1, alpha);
        const drawSize = pSize * scale;
        const centerOffset = (this.shapeCanvas.width - drawSize) / 2;
        
        ctx.drawImage(
            this.shapeCanvas, 
            x - drawSize / 2, 
            y - drawSize / 2, 
            drawSize, 
            drawSize
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  hexToRgb(hex) {
    if (!hex || hex.length < 4) hex = '#FFFFFF';
    let r, g, b;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return { r, g, b };
  }
}
