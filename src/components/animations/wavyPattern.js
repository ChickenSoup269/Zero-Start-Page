/**
 * WavyPatternEffect — animated scallop/fish-scale CSS pattern (NO BACKGROUND)
 *
 * Tối ưu hóa hiệu suất (GPU Acceleration) và đã loại bỏ background sọc phía sau
 * để pattern có nền trong suốt.
 */
export class WavyPatternEffect {
  constructor(color1 = "#AB3E5B", color2 = "#FFBE40", size = 140, speed = 2.5) {
    this.active = false
    this.color1 = color1
    this.color2 = color2
    this.size = size
    this.speed = speed

    this._initDOM()
    this._initStyle()
  }

  // Khởi tạo DOM với 4 Layer sóng
  _initDOM() {
    this._outer = document.getElementById("wavy-pattern-outer")
    if (!this._outer) {
      this._outer = document.createElement("div")
      this._outer.id = "wavy-pattern-outer"
      Object.assign(this._outer.style, {
        position: "fixed",
        inset: "0",
        zIndex: "-1",
        pointerEvents: "none",
        display: "none",
        overflow: "hidden", // Cắt phần thừa khi layer trượt
      })

      // Tạo 4 layer cho 4 hướng chuyển động
      for (let i = 4; i >= 1; i--) {
        const layer = document.createElement("div")
        layer.className = `wavy-layer layer-${i}`
        this._outer.appendChild(layer)
      }

      document.body.appendChild(this._outer)
    }
  }

  // Khởi tạo CSS tĩnh (Đã xóa thuộc tính background của container)
  _initStyle() {
    this._styleEl = document.getElementById("wavy-pattern-style")
    if (!this._styleEl) {
      this._styleEl = document.createElement("style")
      this._styleEl.id = "wavy-pattern-style"

      this._styleEl.textContent = `
        #wavy-pattern-outer {
          --_g: #0000 25%, #0008 47%, var(--c1) 53% 147%, var(--c2) 153% 247%, 
                var(--c1) 253% 347%, var(--c2) 353% 447%, var(--c1) 453% 547%, #0008 553%, #0000 575%;
          --_s: calc(25% / 3) calc(25% / 4) at 50%;
        }

        #wavy-pattern-outer .wavy-layer {
          position: absolute;
          top: -10vh; bottom: -10vh;
          left: calc(-2 * var(--s)); right: calc(-2 * var(--s));
          background-size: var(--s) calc(1.5 * var(--s));
          will-change: transform;
        }

        #wavy-pattern-outer .layer-4 {
          background-image: radial-gradient(var(--_s) 0, var(--_g));
          background-position: 0 calc(3 * var(--s) / 4);
          animation: wavy-left var(--dur) linear infinite;
        }
        #wavy-pattern-outer .layer-3 {
          background-image: radial-gradient(var(--_s) 0, var(--_g));
          background-position: calc(var(--s) / 2) 0;
          animation: wavy-right var(--dur) linear infinite;
        }
        #wavy-pattern-outer .layer-2 {
          background-image: radial-gradient(var(--_s) 100%, var(--_g));
          background-position: calc(var(--s) / 2) calc(3 * var(--s) / 4);
          animation: wavy-left var(--dur) linear infinite;
        }
        #wavy-pattern-outer .layer-1 {
          background-image: radial-gradient(var(--_s) 100%, var(--_g));
          background-position: 0 0;
          animation: wavy-right var(--dur) linear infinite;
        }

        @keyframes wavy-right {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(var(--s), 0, 0); }
        }
        @keyframes wavy-left {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(calc(-1 * var(--s)), 0, 0); }
        }
      `
      document.head.appendChild(this._styleEl)
    }
  }

  // Cập nhật các biến CSS khi đổi màu/kích thước
  _updateVariables() {
    const style = this._outer.style
    style.setProperty("--s", `${this.size}px`)
    style.setProperty("--c1", this.color1)
    style.setProperty("--c2", this.color2)
    style.setProperty("--dur", `${this.speed}s`)
  }

  start() {
    this.active = true
    this._updateVariables()
    this._outer.style.display = "block"
  }

  stop() {
    this.active = false
    this._outer.style.display = "none"
  }

  setColors(color1, color2) {
    this.color1 = color1 ?? this.color1
    this.color2 = color2 ?? this.color2
    if (this.active) this._updateVariables()
  }

  get color() {
    return this.color1
  }

  set color(v) {
    this.setColors(v, this.color2)
  }
}
