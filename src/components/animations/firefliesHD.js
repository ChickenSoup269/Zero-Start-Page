/**
 * FirefliesHD -- Hollywood AAA Ultra HD Fireflies Engine
 */

import { FirefliesEffect } from "./fireflies.js"

export class FirefliesHD extends FirefliesEffect {
  constructor(canvasId, color = "#ffe855", mode = "enchanted") {
    super(canvasId, color, typeof mode === "string" ? mode : "enchanted")
  }

  setOptions(options = {}) {
    if (options.color) this.updateColor(options.color)
    if (options.mode) this.setMode(options.mode)
  }
}
