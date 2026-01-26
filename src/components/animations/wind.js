// wind.js

class SpeedLine {
    constructor(width, height) {
        this.reset(width, height, true);
    }

    reset(width, height, initial = false) {
        this.width = Math.random() * 200 + 100;
        this.height = Math.random() * 2 + 1;
        this.x = initial ? Math.random() * width : width + this.width;
        this.y = Math.random() * height;
        this.speed = Math.random() * 15 + 10;
        this.opacity = Math.random() * 0.4 + 0.1;
    }

    update(width, height) {
        this.x -= this.speed;
        if (this.x < -this.width) {
            this.reset(width, height);
        }
    }

    draw(ctx) {
        ctx.save();
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${this.opacity})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

export class WindEffect {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");
        this.lines = [];
        this.animationFrameId = null;
        this.init();
        window.addEventListener("resize", () => this.handleResize());
    }

    init() {
        this.handleResize();
        this.createLines();
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

    createLines() {
        this.lines = [];
        for (let i = 0; i < 60; i++) {
            this.lines.push(new SpeedLine(this.width, this.height));
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.lines.forEach(line => {
            line.update(this.width, this.height);
            line.draw(this.ctx);
        });

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
}
