/**
 * RainHDEffect -- Hollywood AAA Unified Rain Engine Alias
 */

import { StarFall } from "./rainGalaxy.js"

export class RainHDEffect extends StarFall {
  constructor(canvasId, color = "#99ccff", options = {}) {
    super(canvasId, color, options.mode || "storm", options)
    this.color = color
  }

  _parseColor(hex) {
    this.color = hex
    this.updateColor(hex)
  }

  setOptions(options = {}) {
    super.setOptions(options)
    if (options.color) {
      this.color = options.color
      this.updateColor(options.color)
    }
  }
}
