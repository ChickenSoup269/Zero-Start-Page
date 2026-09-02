/**
 * RainHDEffect -- Backward-Compatible Alias to Unified StarFall Engine (Storm Mode)
 */

import { StarFall } from "./rainGalaxy.js"

export class RainHDEffect extends StarFall {
  constructor(canvasId, color = "#99ccff", options = {}) {
    super(canvasId, color, "storm")
    this.color = color
  }

  _parseColor(hex) {
    this.color = hex
    this.updateColor(hex)
  }

  setOptions(options = {}) {
    // Backward-compatible options hook
  }
}
