/**
 * AngledPatternEffect — animated angled/diamond CSS pattern.
 *
 * Uses `background-position-x` animation to slide the tile horizontally.
 * Inspired by: https://css-pattern.com
 */

export class AngledPatternEffect {
  constructor(
    color1 = "#ECD078",
    color2 = "#0B486B",
    size = 56,
    gap = 10,
    speed = 2.5,
  ) {
    this.active = false
    this.color1 = color1
    this.color2 = color2
    this.size = size
    this.gap = gap
    this.speed = speed

    this._initDOM()
    this._initStyle()
  }

  _initDOM() {
    // Container cố định, bám sát màn hình
    this._outer = document.getElementById("angled-pattern-outer")
    if (!this._outer) {
      this._outer = document.createElement("div")
      this._outer.id = "angled-pattern-outer"
      Object.assign(this._outer.style, {
        position: "fixed",
        inset: "0",
        zIndex: "-1",
        pointerEvents: "none",
        display: "none",
        overflow: "hidden",
        // Tạo viền mờ xung quanh (Vignette) giúp pattern chìm vào nền website đẹp hơn
        maskImage:
          "radial-gradient(circle at center, black 20%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(circle at center, black 20%, transparent 100%)",
      })

      // Lớp inner chứa pattern, sẽ được dịch chuyển (animate)
      this._inner = document.createElement("div")
      this._inner.id = "angled-pattern-inner"
      this._outer.appendChild(this._inner)

      document.body.appendChild(this._outer)
    } else {
      this._inner = document.getElementById("angled-pattern-inner")
    }
  }

  _initStyle() {
    this._styleEl = document.getElementById("angled-pattern-style")
    if (!this._styleEl) {
      this._styleEl = document.createElement("style")
      this._styleEl.id = "angled-pattern-style"

      this._styleEl.textContent = `
        #angled-pattern-outer {
          /* Định nghĩa các công thức cốt lõi */
          --_l: #0000 calc(33% - .866*var(--g)), var(--c1) calc(33.2% - .866*var(--g)) 33%, #0000 34%;
        }

        #angled-pattern-inner {
          position: absolute;
          /* Mở rộng không gian để khi trượt không bị lộ mép */
          top: -10vh; bottom: -10vh;
          left: calc(-2 * var(--s)); right: calc(-2 * var(--s));
          
          background:
            repeating-linear-gradient(var(--c1) 0 var(--g), #0000 0 50%) 0 calc(.866*var(--s) - var(--g)/2),
            conic-gradient(from -150deg at var(--g) 50%, var(--c1) 120deg, #0000 0),
            linear-gradient(-120deg, var(--_l)),
            linear-gradient(-60deg, var(--_l))
            var(--c2); /* Background color */
            
          background-size: var(--s) calc(3.466*var(--s));
          
          /* Mask cắt lớp đặc trưng của pattern này */
          -webkit-mask: linear-gradient(#000 50%, #0000 0) 0 calc(.866*var(--s)) / 100% calc(3.466*var(--s));
          mask: linear-gradient(#000 50%, #0000 0) 0 calc(.866*var(--s)) / 100% calc(3.466*var(--s));

          will-change: transform;
          animation: angled-pattern-anim var(--dur) linear infinite reverse;
        }

        /* Sử dụng Translate3d để GPU xử lý mượt mà 60fps */
        @keyframes angled-pattern-anim {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(calc(-1 * var(--s)), 0, 0); }
        }
      `
      document.head.appendChild(this._styleEl)
    }
  }

  _updateVariables() {
    const style = this._outer.style
    style.setProperty("--s", `${this.size}px`)
    style.setProperty("--g", `${this.gap}px`)
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
    this._outer.style.removeProperty("--s")
    this._outer.style.removeProperty("--g")
    this._outer.style.removeProperty("--c1")
    this._outer.style.removeProperty("--c2")
    this._outer.style.removeProperty("--dur")
  }

  setColors(color1, color2) {
    this.color1 = color1 ?? this.color1
    this.color2 = color2 ?? this.color2
    if (this.active) {
      this._updateVariables()
    }
  }

  get color() {
    return this.color1
  }

  set color(v) {
    this.setColors(v, this.color2)
  }
}
