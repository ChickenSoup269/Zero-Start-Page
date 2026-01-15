
/* Star Fall Effect Logic (to be integrated) */
class StarFall {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.active = false;
        this.animationFrame = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.createStars();
        this.animate();
        this.canvas.style.display = 'block';
    }

    stop() {
        this.active = false;
        cancelAnimationFrame(this.animationFrame);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.display = 'none';
        this.stars = [];
    }

    createStars() {
        const count = 100;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                length: Math.random() * 20 + 10,
                speed: Math.random() * 5 + 2,
                opacity: Math.random()
            });
        }
    }

    animate() {
        if (!this.active) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;

        this.stars.forEach(star => {
            this.ctx.beginPath();
            const tailX = star.x + star.length * 0.5; // Angled slightly? Let's do straight down or angled
            // Let's do a "Star Fall" / Rain effect (falling down)
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(star.x, star.y + star.length);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${star.opacity})`;
            this.ctx.stroke();

            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = -star.length;
                star.x = Math.random() * this.canvas.width;
            }
        });

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
}
