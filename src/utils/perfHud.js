import { makeDraggable } from "./draggable.js"

export class PerfHUD {
  constructor() {
    this.el = document.createElement("div")
    this.el.id = "perf-hud"
    this.el.className = "perf-hud-container"
    
    if (!document.getElementById("perf-hud-styles")) {
      const style = document.createElement("style")
      style.id = "perf-hud-styles"
      style.textContent = `
        .perf-hud-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 220px;
          color: var(--text-color, #ffffff);
          font-family: var(--font-family, 'Inter', sans-serif);
          font-size: 13px;
          z-index: 999999;
          transition: opacity 0.3s ease, transform 0.3s ease;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          
          /* Matching standard extension widgets (e.g. Context Menu) */
          background: var(--glass-bg, rgba(20, 20, 25, 0.7));
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
          border-radius: var(--radius-md, 12px);
          box-shadow: var(--glass-shadow, 0 8px 24px rgba(0,0,0,0.2));
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .perf-hud-container.is-active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        
        /* Mirroring Context Menu Backgrounds smoothly */
        body.context-menu-dark .perf-hud-container { background: rgba(35, 35, 45, 0.75); }
        body.context-menu-light .perf-hud-container { 
          background: rgba(255, 255, 255, 0.7); 
          color: #1a1a1a; 
          border: 1px solid rgba(0,0,0,0.1); 
        }
        body.context-menu-m3 .perf-hud-container {
          background: radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--m3-primary, var(--safe-accent)) 20%, transparent), transparent 36%),
                      linear-gradient(135deg, color-mix(in srgb, var(--m3-primary-container, var(--safe-accent)) 76%, transparent), color-mix(in srgb, var(--m3-tertiary-container, var(--safe-accent)) 30%, transparent));
        }

        .perf-hud-header {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
          user-select: none;
          font-weight: 600;
        }
        body.context-menu-light .perf-hud-header {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .perf-hud-body {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          user-select: none;
        }
        
        .perf-hud-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .perf-hud-label {
          opacity: 0.8;
          font-size: 12px;
        }
        
        .perf-hud-value {
          font-family: monospace;
          font-size: 13px;
          font-weight: 600;
        }

        /* Status Colors */
        .val-good { color: var(--accent-color, #4ade80); }
        .val-warn { color: #facc15; }
        .val-danger { color: #f87171; }
        body.context-menu-light .val-good { color: #16a34a; }
        body.context-menu-light .val-warn { color: #ca8a04; }
        body.context-menu-light .val-danger { color: #dc2626; }
      `
      document.head.appendChild(style)
    }

    this.header = document.createElement("div")
    this.header.className = "perf-hud-header"
    this.el.appendChild(this.header)
    
    this.body = document.createElement("div")
    this.body.className = "perf-hud-body"
    this.el.appendChild(this.body)

    document.body.appendChild(this.el)

    // makeDraggable(element, componentId, onDragEndCallback, handleSelector)
    makeDraggable(this.el, "perfHud", null, ".perf-hud-container")

    this.frames = 0
    this.lastTime = performance.now()
    this.fps = 0
    this.active = false
    this.updateInterval = null
    this.rafId = null

    this.loop = this.loop.bind(this)
    this.updateUI = this.updateUI.bind(this)
  }

  toggle() {
    this.active = !this.active
    if (this.active) {
      this.el.classList.add("is-active")
      this.lastTime = performance.now()
      this.frames = 0
      this.rafId = requestAnimationFrame(this.loop)
      this.updateInterval = setInterval(this.updateUI, 1000)
      this.updateUI()
    } else {
      this.el.classList.remove("is-active")
      if (this.rafId) cancelAnimationFrame(this.rafId)
      if (this.updateInterval) clearInterval(this.updateInterval)
    }
  }

  loop(now) {
    if (!this.active) return
    this.frames++
    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime))
      this.frames = 0
      this.lastTime = now
    }
    this.rafId = requestAnimationFrame(this.loop)
  }

  getFpsClass(fps) {
    if (fps >= 55) return "val-good"
    if (fps >= 30) return "val-warn"
    return "val-danger"
  }

  getMemoryClass(mem) {
    if (mem < 80) return "val-good"
    if (mem < 150) return ""
    if (mem < 250) return "val-warn"
    return "val-danger"
  }
  
  getNodeClass(nodes) {
    if (nodes < 1500) return ""
    if (nodes < 2500) return "val-warn"
    return "val-danger"
  }

  updateUI() {
    if (!this.active) return
    
    let memValue = 0
    let memDisplay = "N/A"
    
    if (performance.memory) {
      memValue = performance.memory.usedJSHeapSize / 1048576
      memDisplay = memValue.toFixed(1) + " MB"
    }
    
    const nodes = document.getElementsByTagName('*').length
    
    const fpsClass = this.getFpsClass(this.fps)
    const memClass = this.getMemoryClass(memValue)
    const nodeClass = this.getNodeClass(nodes)
    
    const isPaused = document.hidden ? `<i class="fa-solid fa-pause" style="margin-left:4px; opacity:0.5; font-size: 10px;" title="Paused"></i>` : ""

    this.header.innerHTML = `
      <i class="fa-solid fa-microchip"></i>
      <span>Performance</span>
    `

    this.body.innerHTML = `
      <div class="perf-hud-row">
        <span class="perf-hud-label">FPS</span>
        <span class="perf-hud-value ${fpsClass}">${this.fps} ${isPaused}</span>
      </div>
      <div class="perf-hud-row">
        <span class="perf-hud-label">JS Heap</span>
        <span class="perf-hud-value ${memClass}">${memDisplay}</span>
      </div>
      <div class="perf-hud-row">
        <span class="perf-hud-label">DOM Nodes</span>
        <span class="perf-hud-value ${nodeClass}">${nodes}</span>
      </div>
    `
  }
}

export function initPerfHud() {
  if (window.perfHUD) return
  window.perfHUD = new PerfHUD()

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "p") {
      e.preventDefault()
      window.perfHUD.toggle()
    }
  })
}
