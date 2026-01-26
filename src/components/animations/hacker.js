// hacker.js

const snippets = [
  "const init = () => { console.log('Initializing...'); };",
  "function hack() { return Promise.resolve('Access Granted'); }",
  "document.querySelectorAll('.node').forEach(n => n.activate());",
  "import { system } from './core.js'; system.boot();",
  "await fetch('/api/v1/auth').then(res => res.json());",
  "if (security === null) throw new Error('Void Protocol');",
  "export class Kernel { constructor() { this.v = 1.0; } }",
  "const payload = btoa('root:admin'); req.send(payload);",
  "setInterval(() => backup.sync(), 60000);",
  "Object.assign(env, { DEBUG: true, PORT: 8080 });",
  "const query = `SELECT * FROM users WHERE id = ${uid}`;",
  "while (true) { if (buffer.isFull()) flush(); }",
  "CSS.registerProperty({ name: '--glow', syntax: '<color>' });",
  "navigator.serviceWorker.register('/sw.js').then(ok);"
];

// States for the cinematic sequence
const STATES = {
  TYPING: 0,
  LOADING: 1,
  FLOOD: 2
};

class TerminalBlock {
  constructor(x, y, width, color) {
    this.reset(x, y, width, color);
  }

  reset(x, y, width, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.color = color;
    this.lines = [];
    this.maxLines = 10;
    this.currentText = "";
    this.targetText = snippets[Math.floor(Math.random() * snippets.length)];
    this.charIndex = 0;
    this.lastCharTime = Date.now();
    this.typingSpeed = Math.random() * 50 + 30;
    this.isDone = false;
    this.opacity = 0.8;
  }

  update() {
    if (this.isDone) {
        this.opacity -= 0.005;
        if (this.opacity <= 0) return true; // Signal reset
        return false;
    }

    const now = Date.now();
    if (now - this.lastCharTime > this.typingSpeed) {
      if (this.charIndex < this.targetText.length) {
        this.currentText += this.targetText[this.charIndex];
        this.charIndex++;
        this.lastCharTime = now;
      } else {
        this.lines.push(this.currentText);
        if (this.lines.length > this.maxLines) this.lines.shift();
        
        if (Math.random() > 0.3) {
            this.currentText = "";
            this.targetText = snippets[Math.floor(Math.random() * snippets.length)];
            this.charIndex = 0;
            this.typingSpeed = Math.random() * 50 + 30;
        } else {
            this.isDone = true;
        }
      }
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    
    this.lines.forEach((line, i) => {
        ctx.fillText(line, this.x, this.y + i * 18);
    });

    const currentY = this.y + this.lines.length * 18;
    const cursor = (Math.floor(Date.now() / 500) % 2 === 0) ? "_" : " ";
    ctx.fillText(this.currentText + (this.isDone ? "" : cursor), this.x, currentY);
    
    ctx.restore();
  }
}

export class HackerEffect {
  constructor(canvasId, color = "#00FF00") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.color = color;
    this.blocks = [];
    this.animationFrameId = null;
    this.currentState = STATES.TYPING;
    this.typingStartTime = Date.now(); // Track when typing started
    this.sequenceInterval = 30000; // 30 seconds
    this.stateTimer = 0;
    this.progress = 0; // For loading state
    
    // For Flood state (Binary Rain columns)
    this.floodColumns = [];
    this.fontSize = 14;

    this.init();
    window.addEventListener("resize", () => this.handleResize());
  }

  init() {
    this.handleResize();
    this.createBlocks();
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
    this.createBlocks();
    
    // Reinit flood columns
    const cols = Math.ceil(this.width / this.fontSize);
    this.floodColumns = Array(cols).fill(0).map(() => Math.random() * -100);
  }

  createBlocks() {
    this.blocks = [];
    for (let i = 0; i < 4; i++) {
        this.spawnBlock();
    }
  }

  spawnBlock() {
      const margin = 50;
      const x = margin + Math.random() * (this.width - 300 - margin * 2);
      const y = margin + Math.random() * (this.height - 200 - margin * 2);
      this.blocks.push(new TerminalBlock(x, y, 300, this.color));
  }

  drawLoading() {
      this.ctx.save();
      const barWidth = 400;
      const barHeight = 30;
      const x = (this.width - barWidth) / 2;
      const y = (this.height - barHeight) / 2;

      this.ctx.font = "20px 'Courier New', monospace";
      this.ctx.fillStyle = this.color;
      this.ctx.textAlign = "center";
      
      const dots = ".".repeat(Math.floor(Date.now() / 300) % 4);
      this.ctx.fillText(`EXECUTING PAYLOAD${dots}`, this.width / 2, y - 30);

      // Bar border
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, barWidth, barHeight);

      // Fill bar
      const fillW = (this.progress / 100) * barWidth;
      this.ctx.fillRect(x + 4, y + 4, Math.max(0, fillW - 8), barHeight - 8);

      // Percentage
      this.ctx.fillText(`${Math.floor(this.progress)}%`, this.width / 2, y + barHeight + 35);
      
      this.ctx.restore();
      
      this.progress += Math.random() * 0.5 + 0.2;
      if (this.progress >= 100) {
          this.currentState = STATES.FLOOD;
          this.stateTimer = Date.now();
      }
  }

  drawFlood() {
      this.ctx.save();
      this.ctx.font = `${this.fontSize}px monospace`;
      this.ctx.fillStyle = this.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = this.color;

      for (let i = 0; i < this.floodColumns.length; i++) {
          const char = Math.random() > 0.5 ? "1" : "0";
          const x = i * this.fontSize;
          const y = this.floodColumns[i] * this.fontSize;

          this.ctx.fillText(char, x, y);

          if (y > this.height && Math.random() > 0.8) {
              this.floodColumns[i] = 0;
          } else {
              this.floodColumns[i]++;
          }
      }
      this.ctx.restore();

      // Clear trails
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      this.ctx.fillRect(0, 0, this.width, this.height);

      if (Date.now() - this.stateTimer > 6000) { // 6 seconds of flood
          this.currentState = STATES.TYPING;
          this.typingStartTime = Date.now(); // Reset the cycle
          this.progress = 0;
          this.ctx.clearRect(0,0,this.width, this.height);
          this.createBlocks();
      }
  }

  animate() {
    if (!this.animationFrameId) return;

    if (this.currentState !== STATES.FLOOD) {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    if (this.currentState === STATES.TYPING) {
        this.blocks.forEach((block) => {
          const shouldReset = block.update();
          if (shouldReset) {
              const margin = 50;
              const x = margin + Math.random() * (this.width - 300 - margin * 2);
              const y = margin + Math.random() * (this.height - 200 - margin * 2);
              block.reset(x, y, 300, this.color);
          }
          block.draw(this.ctx);
        });

        // Trigger loading sequence every 30 seconds
        if (Date.now() - this.typingStartTime > this.sequenceInterval) {
            this.currentState = STATES.LOADING;
            this.progress = 0;
        }
    } else if (this.currentState === STATES.LOADING) {
        this.drawLoading();
    } else if (this.currentState === STATES.FLOOD) {
        this.drawFlood();
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  start() {
    if (!this.animationFrameId) {
      this.canvas.style.display = "block";
      this.animationFrameId = requestAnimationFrame(() => this.animate());
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
    this.blocks.forEach(b => b.color = color);
  }
}
