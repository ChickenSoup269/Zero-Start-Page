// Music Visualizer Component
import { getSettings } from "../services/state.js"

class MusicVisualizer {
  constructor() {
    this.container = null
    this.bars = []
    this.isPlaying = false
    this.animationId = null
    this.barCount = 5
    this.currentStyle = "vinyl"
    this.currentVisualizerStyle = "bars"
  }

  init(musicPlayerContainer) {
    // Create visualizer container
    this.container = document.createElement("div")
    this.container.className = "music-visualizer"

    // Create bars
    for (let i = 0; i < this.barCount; i++) {
      const bar = document.createElement("div")
      bar.className = "visualizer-bar"
      bar.style.animationDelay = `${i * 0.1}s`
      this.bars.push(bar)
      this.container.appendChild(bar)
    }

    // Insert visualizer into music player
    const playerWrapper = musicPlayerContainer.querySelector(
      ".music-player-wrapper",
    )
    if (playerWrapper) {
      playerWrapper.appendChild(this.container)
    }

    this.setStyle(getSettings().musicBarStyle || "vinyl")
    this.setVisualizerStyle(getSettings().musicVisualizerStyle || "bars")
  }

  setStyle(style) {
    this.currentStyle = style
  }

  setVisualizerStyle(style) {
    this.currentVisualizerStyle = style
  }

  refresh() {
    // Placeholder for refresh logic
  }

  start() {
    if (this.isPlaying) return
    this.isPlaying = true
    this.bars.forEach((bar) => {
      bar.classList.add("playing")
    })
  }

  stop() {
    this.isPlaying = false
    this.bars.forEach((bar) => {
      bar.classList.remove("playing")
    })
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.bars = []
  }
}

export default MusicVisualizer
