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

class SpeedLine3D {
    constructor(width, height) {
        this.reset(width, height, true);
    }

    reset(width, height, initial = false) {
        // Tạo vị trí trong không gian 3D
        this.x = (Math.random() - 0.5) * width * 4;
        this.y = (Math.random() - 0.5) * height * 4;
        this.z = initial ? Math.random() * 2000 : 2000;
        
        // Tốc độ nhanh hơn một chút (15-35)
        this.speed = Math.random() * 20 + 15; 
        this.length = Math.random() * 400 + 200; 
        this.opacity = 0;
    }

    update(width, height) {
        this.z -= this.speed;
        if (this.z < 1) {
            this.reset(width, height);
        }
        // Fade in/out mượt mà
        this.opacity = Math.min(1, (2000 - this.z) / 600) * Math.min(1, this.z / 400);
    }

    draw(ctx, width, height) {
        const factor = 1000 / this.z;
        const x = this.x * factor + width / 2;
        const y = this.y * factor + height / 2;
        
        const h = this.length * factor * 0.4;
        const w = Math.max(0.5, 1.2 * factor);

        if (x < -width || x > width * 2 || y < -height || y > height * 2) return;

        ctx.save();
        ctx.translate(x, y);
        
        const angleToCenter = Math.atan2(y - height / 2, x - width / 2);
        ctx.rotate(angleToCenter + Math.PI / 2); 
        ctx.rotate(0.05); 

        const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${this.opacity * 0.5})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(-w/2, -h/2, w, h);
        ctx.restore();
    }
}

export class WindEffect {
    constructor(canvasId, mode = "2d") {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext("2d");
        this.lines = [];
        this._animId = null;
        this.mode = mode; // "2d" or "3d"
        this.init();
        window.addEventListener("resize", () => this.handleResize());
    }

    setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;
        this.createLines();
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
        // Giữ số lượng tia ở mức 150 để cân bằng giữa độ phủ và hiệu suất
        const count = this.mode === "3d" ? 150 : 60;
        for (let i = 0; i < count; i++) {
            if (this.mode === "3d") {
                this.lines.push(new SpeedLine3D(this.width, this.height));
            } else {
                this.lines.push(new SpeedLine(this.width, this.height));
            }
        }
    }

    animate() {
        if (this._animId) this._animId = requestAnimationFrame(() => this.animate());
        if (document.visibilityState === "hidden") return

        this.ctx.clearRect(0, 0, this.width, this.height);

        this.lines.forEach(line => {
            line.update(this.width, this.height);
            if (this.mode === "3d") {
                line.draw(this.ctx, this.width, this.height);
            } else {
                line.draw(this.ctx);
            }
        });
    }

    start() {
        if (!this._animId) {
            this.canvas.style.display = "block";
            this._animId = requestAnimationFrame(() => this.animate());
        }
    }

    stop() {
        if (this._animId) {
            cancelAnimationFrame(this._animId);
            this._animId = null;
        }
        if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
        this.canvas.style.display = "none";
        this.lines = [];
    }
}
