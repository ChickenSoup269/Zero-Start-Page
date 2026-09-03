import { AutumnLeavesEffect } from "./autumnLeaves.js"

/**
 * GreenLeavesEffect — Hollywood AAA Green Leaves in the Wind Engine
 *
 * Backward-compatible wrapper over the Unified Leaves Fall Engine with "simple" (Summer Green) leaf default.
 */
export class GreenLeavesEffect extends AutumnLeavesEffect {
  constructor(canvasId = "effect-canvas") {
    super(canvasId, "simple")
  }
}
