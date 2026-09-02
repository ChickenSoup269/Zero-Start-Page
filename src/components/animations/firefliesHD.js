/**
 * FirefliesHD -- Backward-Compatible Alias to Hollywood AAA Fireflies Engine
 */

import { FirefliesEffect } from "./fireflies.js"

export class FirefliesHD extends FirefliesEffect {
  constructor(canvasId, color = "#ffe855", options = {}) {
    super(canvasId, color, "enchanted")
  }

  setOptions() {}
}
