// shootingStar.js

/**
 * Utility to convert hex color to RGB string
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== "string" || hex.charAt(0) !== "#") return "0,0,0";
  hex = hex.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return "0,0,0";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return isNaN(r) || isNaN(g) || isNaN(b) ? "0,0,0" : `${r},${g},${b}`;
}

class ShootingStar {
  constructor(width, height, color) {
    this.reset(width, height, color);
  }

  reset(width, height, color) {
    this.x = Math.random() * width * 1.5; 
    this.y = -Math.random() * height * 0.5;
    
    // Variance in speed: some very fast (30+), some very slow (5-10)
    const speedType = Math.random();
    if (speedType < 0.2) {
      this.speed = Math.random() * 5 + 5; // Slow: 5-10
      this.length = Math.random() * 50 + 50;
    } else if (speedType > 0.8) {
      this.speed = Math.random() * 10 + 30; // Very fast: 30-40
      this.length = Math.random() * 100 + 200;
    } else {
      this.speed = Math.random() * 10 + 15; // Normal: 15-25
      this.length = Math.random() * 80 + 100;
    }

    this.size = Math.random() * 1.5 + 1;
    this.angle = (135 * Math.PI) / 180 + (Math.random() - 0.5) * 0.2;
    this.color = color;
    this.opacity = 1;
    this.active = true;
  }

  update(width, height) {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    if (this.y > height * 0.8) {
      this.opacity -= 0.015;
    }

    if (this.x < -this.length || this.y > height + this.length || this.opacity <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const gradient = ctx.createLinearGradient(0, 0, -this.length, 0);
    const rgb = hexToRgb(this.color);
    gradient.addColorStop(0, `rgba(${rgb}, ${this.opacity})`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = this.size;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.length, 0);
    ctx.stroke();

    // Enhanced head glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(${rgb}, ${this.opacity})`;
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class BackgroundStar {
  constructor(width, height, color) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 1.2 + 0.2;
    this.baseAlpha = Math.random() * 0.5 + 0.2;
    this.alpha = this.baseAlpha;
    this.twinkleFactor = Math.random() * 0.03 + 0.005;
    this.color = color;
    this.phase = Math.random() * Math.PI * 2;
    this.isSparkle = Math.random() < 0.05; // 5% chance to be a specialized sparkle star
  }

  update() {
    this.phase += this.twinkleFactor;
    // Sharper twinkle for sparkle stars
    const sine = Math.sin(this.phase);
    if (this.isSparkle) {
      this.alpha = this.baseAlpha + Math.pow(Math.abs(sine), 10) * 0.8;
    } else {
      this.alpha = this.baseAlpha + sine * 0.2;
    }
  }

  draw(ctx) {
    const rgb = hexToRgb(this.color);
    ctx.fillStyle = `rgba(${rgb}, ${this.alpha})`;
    
    if (this.isSparkle && this.alpha > 0.8) {
      // Draw a small cross sparkle for highlighting
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      ctx.moveTo(-this.size * 3, 0);
      ctx.lineTo(this.size * 3, 0);
      ctx.moveTo(0, -this.size * 3);
      ctx.lineTo(0, this.size * 3);
      ctx.strokeStyle = `rgba(${rgb}, ${this.alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class ShootingStarEffect {
  constructor(canvasId, particleColor, bgColor, starColor) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    
    this.particleColor = particleColor || "#ffffff";
    this.backgroundColor = bgColor || "#000000";
    this.starColor = starColor || "#ffffff";
    
    this.stars = [];
    this.shootingStars = [];
    this.maxStars = 200;
    this.animationFrameId = null;

    this.init();
    window.addEventListener("resize", () => this.handleResize());
  }

  init() {
    this.handleResize();
    this.createBackgroundStars();
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.createBackgroundStars();
  }

  createBackgroundStars() {
    this.stars = [];
    for (let i = 0; i < this.maxStars; i++) {
      this.stars.push(new BackgroundStar(this.width, this.height, this.starColor));
    }
  }

  createShootingStar() {
    if (this.shootingStars.length < 3 && Math.random() < 0.005) {
      this.shootingStars.push(new ShootingStar(this.width, this.height, this.particleColor));
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw background color if needed (depending on how it's integrated)
    // Here we assume the canvas might be transparent or have a color
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw static stars
    this.stars.forEach(star => {
      star.update();
      star.draw(this.ctx);
    });

    // Draw shooting stars
    this.createShootingStar();
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.update(this.width, this.height);
      s.draw(this.ctx);
      if (!s.active) {
        this.shootingStars.splice(i, 1);
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  start() {
    if (!this.animationFrameId) {
      this.canvas.style.display = "block";
      this.animate();
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.canvas.style.display = "none";
      this.shootingStars = [];
    }
  }

  updateParticleColor(color) {
    this.particleColor = color;
  }

  updateBackgroundColor(color) {
    this.backgroundColor = color;
  }

  updateStarColor(color) {
    this.starColor = color;
    this.createBackgroundStars();
  }
}
