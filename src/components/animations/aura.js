// aura.js

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

class Blob {
  constructor(width, height, color) {
    this.reset(width, height, color);
  }

  reset(width, height, color) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = Math.random() * 200 + 150;
    this.color = color;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -this.radius) this.x = width + this.radius;
    if (this.x > width + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = height + this.radius;
    if (this.y > height + this.radius) this.y = -this.radius;
  }

  draw(ctx) {
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );
    const rgb = hexToRgb(this.color);
    gradient.addColorStop(0, `rgba(${rgb}, 0.5)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class AuraEffect {
  constructor(canvasId, color) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.color = color || "#a8c0ff";
    this.blobs = [];
    this.animationFrameId = null;
    this.init();
    window.addEventListener("resize", () => this.handleResize());
  }

  init() {
    this.handleResize();
    this.createBlobs();
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
  }

  createBlobs() {
    this.blobs = [];
    for (let i = 0; i < 8; i++) {
      this.blobs.push(new Blob(this.width, this.height, this.color));
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = "screen";

    this.blobs.forEach(blob => {
      blob.update(this.width, this.height);
      blob.draw(this.ctx);
    });

    this.ctx.globalCompositeOperation = "source-over";
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
    }
  }

  updateColor(color) {
    this.color = color;
    this.blobs.forEach(blob => blob.color = color);
  }
}
