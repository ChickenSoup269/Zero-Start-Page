export class FallingMeteor {
  constructor(canvasId, color = "#ffffff") {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.meteors = [];
    this.active = false;
    this.animationFrame = null;
    this.meteorColor = color; // Store the custom color
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.createMeteors();
    this.animate();
    this.canvas.style.display = "block";
  }

  stop() {
    this.active = false;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = "none";
    this.meteors = [];
  }

  createMeteors() {
    const count = 20; // Fewer meteors than stars for a different feel
    for (let i = 0; i < count; i++) {
      this.meteors.push({
        x: Math.random() * this.canvas.width * 0.8, // Start within the top-left 80% width
        y: Math.random() * this.canvas.height * 0.2 - 200, // Start above the screen, concentrated at top-left
        length: Math.random() * 80 + 40, // Longer meteors
        speed: Math.random() * 5 + 2, // Slower speed
        angle: Math.PI / 4, // 45 degrees for top-left to bottom-right
      });
    }
  }

  animate() {
    if (!this.active) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.meteors.forEach((meteor) => {
      // Calculate the head and tail positions of the meteor
      // The meteor's 'x' and 'y' define the tail end, and the head is further along its path.
      const headX = meteor.x + Math.cos(meteor.angle) * meteor.length;
      const headY = meteor.y + Math.sin(meteor.angle) * meteor.length;

      const tailX = meteor.x;
      const tailY = meteor.y;

      // Create a linear gradient for the tail, fading from bright to transparent
      const gradient = this.ctx.createLinearGradient(headX, headY, tailX, tailY);
      // Convert hex color to rgba for gradient
      const r = parseInt(this.meteorColor.slice(1, 3), 16);
      const g = parseInt(this.meteorColor.slice(3, 5), 16);
      const b = parseInt(this.meteorColor.slice(5, 7), 16);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`); // Bright head
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`); // Fading tail

      // Draw the meteor's tail
      this.ctx.beginPath();
      this.ctx.moveTo(tailX, tailY); // Start drawing from the tail end
      this.ctx.lineTo(headX, headY); // Draw to the head end
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 3; // Thicker line for the tail
      this.ctx.stroke();

      // Draw a very small, very bright circle at the head for a distinct bright spot
      this.ctx.beginPath();
      this.ctx.arc(headX, headY, 1.5, 0, Math.PI * 2); // Small, pure white head dot
      this.ctx.fillStyle = this.meteorColor; // Use the custom color for the head
      this.ctx.fill();

      // Update meteor position for the next frame
      meteor.x += meteor.speed * Math.cos(meteor.angle);
      meteor.y += meteor.speed * Math.sin(meteor.angle);

      // Reset meteor if it goes off screen to loop the effect
      if (
        meteor.y > this.canvas.height + meteor.length ||
        meteor.x > this.canvas.width + meteor.length
      ) {
        meteor.x = Math.random() * this.canvas.width * 0.5 - 100; // Reset to top-left area
        meteor.y = Math.random() * this.canvas.height * 0.1 - 200; // Reset above screen
      }
    });

    this.animationFrame = requestAnimationFrame(() => this.animate());
  } // Added missing closing brace for animate method

  updateColor(newColor) {
    this.meteorColor = newColor;
  }
}