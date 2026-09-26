import { clockElement, dateElement } from "../../utils/dom.js"

export function applyHuePerCharacter(target, seed = 0) {
  if (!target) return

  const textNodes = []
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!node.nodeValue || node.nodeValue.length === 0 || !parent) {
        return NodeFilter.FILTER_REJECT
      }

      if (!node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT
      }

      if (parent.classList.contains("clock-hue-char")) {
        return NodeFilter.FILTER_REJECT
      }

      return NodeFilter.FILTER_ACCEPT
    },
  })

  let currentNode = walker.nextNode()
  while (currentNode) {
    textNodes.push(currentNode)
    currentNode = walker.nextNode()
  }

  let hueIndex = 0
  textNodes.forEach((node) => {
    const text = node.nodeValue || ""
    const fragment = document.createDocumentFragment()

    Array.from(text).forEach((char) => {
      if (!char.trim()) {
        fragment.appendChild(document.createTextNode(char))
        return
      }

      const hue = (seed + hueIndex * 43) % 360

      if (
        node.parentElement &&
        node.parentElement.classList.contains("char-anim")
      ) {
        node.parentElement.style.setProperty("--char-hue", String(hue))
        node.parentElement.style.setProperty(
          "--char-delay",
          `${hueIndex * 0.1}s`,
        )
        node.parentElement.style.setProperty(
          "--time-offset",
          `${(Date.now() % 8000) / 1000}s`,
        )
        node.parentElement.classList.add("multi-color-char")
        fragment.appendChild(document.createTextNode(char))
      } else {
        const span = document.createElement("span")
        span.className = "clock-hue-char"
        span.style.setProperty("--char-hue", String(hue))
        span.style.setProperty("--char-delay", `${hueIndex * 0.1}s`)
        span.style.setProperty(
          "--time-offset",
          `${(Date.now() % 8000) / 1000}s`,
        )
        span.textContent = char
        fragment.appendChild(span)
      }
      hueIndex += 1
    })

    node.parentNode?.replaceChild(fragment, node)
  })
}

export function applyHueMode(settings) {
  const mode = settings.hueTextMode || "off"
  if (mode === "off") return

  const style = settings.dateClockStyle || "default"
  const displayMode = settings.clockDisplayMode || "all"

  // 1. Determine targets for Clock effect
  const clockTargets = []
  if (mode === "clock" || mode === "both") {
    if (
      style === "default" ||
      style === "glow" ||
      style === "minimal" ||
      style === "glass" ||
      style === "analog"
    ) {
      clockTargets.push(clockElement)
    } else if (style === "round") {
      clockTargets.push(clockElement.querySelector(".round-clock-digits"))
      clockTargets.push(clockElement.querySelector(".round-clock-ampm"))
    } else if (style === "square") {
      clockTargets.push(clockElement.querySelector(".sq-digits"))
      clockTargets.push(clockElement.querySelector(".sq-ampm"))
    } else if (style === "cool") {
      clockTargets.push(clockElement.querySelector(".cool-time"))
      clockTargets.push(clockElement.querySelector(".cool-time-ampm"))
    } else if (style === "sidestyle") {
      clockTargets.push(clockElement.querySelector(".clock-sidestyle-time"))
    } else if (style === "jp-style") {
      clockTargets.push(clockElement.querySelector(".clock-jp-time"))
    } else if (style === "sidebar") {
      clockTargets.push(clockElement.querySelector(".clock-sidebar-time"))
    } else if (style === "fliqlo") {
      clockTargets.push(clockElement.querySelector(".fliqlo-time"))
    } else if (style === "neon-grid") {
      clockTargets.push(clockElement.querySelector(".neon-grid-time"))
    } else if (style === "terminal") {
      clockTargets.push(clockElement.querySelector(".terminal-clock-time"))
    } else if (style === "c4-bomb") {
      clockTargets.push(clockElement.querySelector(".c4-bomb-time"))
    } else if (style === "holo-ring") {
      clockTargets.push(clockElement.querySelector(".holo-ring-time"))
    } else if (style === "media-orb") {
      clockTargets.push(clockElement.querySelector(".media-orb-time"))
    } else if (style === "prism-stack") {
      clockTargets.push(clockElement.querySelector(".prism-stack-time"))
    } else if (style === "metro-panel") {
      clockTargets.push(clockElement.querySelector(".metro-panel-time"))
    } else if (style === "aurora-ribbon") {
      clockTargets.push(clockElement.querySelector(".aurora-ribbon-time"))
    } else if (style === "bento") {
      clockTargets.push(clockElement.querySelector(".bento-time-tile"))
    } else if (style === "lunar-orbit") {
      clockTargets.push(clockElement.querySelector(".lunar-orbit-time"))
    } else if (style === "cartoon") {
      clockTargets.push(clockElement.querySelector(".cartoon-time"))
    } else if (style === "custom-angle") {
      clockTargets.push(clockElement.querySelector(".custom-angle-time"))
    } else if (style === "space-concentric") {
      clockTargets.push(clockElement.querySelector(".sc-core-time-main"))
    } else if (style === "split-pill") {
      clockTargets.push(clockElement.querySelector(".split-pill-digits"))
    } else if (style === "clock-3d") {
      clockElement
        .querySelectorAll(".clock-3d-cube-digit, .clock-3d-ampm-cube span")
        .forEach((el) => clockTargets.push(el))
    } else if (style === "satellite") {
      clockTargets.push(clockElement.querySelector(".sat-time"))
      clockTargets.push(clockElement.querySelector(".sat-ampm"))
      clockTargets.push(clockElement.querySelector(".sat-seconds"))
    } else if (style === "audio-wave") {
      clockTargets.push(clockElement.querySelector(".aw-time"))
    } else if (style === "glass-float") {
      clockTargets.push(clockElement.querySelector(".gf-time"))
      clockTargets.push(clockElement.querySelector(".gf-text"))
    } else if (style === "macos-vintage") {
      clockTargets.push(clockElement.querySelector(".omp-time-digits"))
      clockTargets.push(clockElement.querySelector(".omp-t-ampm"))
      clockTargets.push(clockElement.querySelector(".omp-t-cursor"))
    } else if (style === "aquarium") {
      clockTargets.push(clockElement.querySelector(".aquarium-hh"))
      clockTargets.push(clockElement.querySelector(".aquarium-mm"))
      clockTargets.push(clockElement.querySelector(".aquarium-ampm"))
      clockTargets.push(clockElement.querySelector(".aquarium-ss"))
    }
  }

  // 2. Determine targets for Date effect
  const dateTargets = []
  if (mode === "date" || mode === "both") {
    // In Weekday-only mode OR Weekday-style, the weekday is always in dateElement
    if (displayMode === "weekday" || style === "weekday-style") {
      dateTargets.push(dateElement)
    } else {
      if (
        style === "default" ||
        style === "glow" ||
        style === "minimal" ||
        style === "glass"
      ) {
        dateTargets.push(dateElement)
      } else if (style === "round") {
        dateTargets.push(clockElement.querySelector(".round-clock-capsule"))
        dateTargets.push(clockElement.querySelector(".round-clock-footer"))
      } else if (style === "square") {
        dateTargets.push(clockElement.querySelector(".sq-date-capsule"))
        dateTargets.push(clockElement.querySelector(".sq-weekday"))
        dateTargets.push(clockElement.querySelector(".sq-year-badge"))
      } else if (style === "cool") {
        dateTargets.push(clockElement.querySelector(".cool-dayname"))
        dateTargets.push(clockElement.querySelector(".cool-date"))
      } else if (style === "sidestyle") {
        dateTargets.push(clockElement.querySelector(".clock-sidestyle-day"))
        dateTargets.push(clockElement.querySelector(".clock-sidestyle-date"))
      } else if (style === "jp-style") {
        dateTargets.push(clockElement.querySelector(".clock-jp-day-left"))
        dateTargets.push(clockElement.querySelector(".clock-jp-date"))
      } else if (style === "sidebar") {
        dateTargets.push(clockElement.querySelector(".clock-sidebar-date"))
      } else if (style === "fliqlo") {
        dateTargets.push(clockElement.querySelector(".fliqlo-date"))
      } else if (style === "neon-grid") {
        dateTargets.push(clockElement.querySelector(".neon-grid-date"))
        dateTargets.push(clockElement.querySelector(".neon-grid-label"))
      } else if (style === "terminal") {
        dateTargets.push(clockElement.querySelector(".terminal-clock-meta"))
        dateTargets.push(clockElement.querySelector(".terminal-clock-date"))
      } else if (style === "c4-bomb") {
        dateTargets.push(clockElement.querySelector(".c4-bomb-status"))
        dateTargets.push(clockElement.querySelector(".c4-bomb-date"))
      } else if (style === "holo-ring") {
        dateTargets.push(clockElement.querySelector(".holo-ring-weekday"))
        dateTargets.push(clockElement.querySelector(".holo-ring-date"))
      } else if (style === "media-orb") {
        dateTargets.push(clockElement.querySelector(".media-orb-weekday"))
        dateTargets.push(clockElement.querySelector(".media-orb-date"))
      } else if (style === "prism-stack") {
        dateTargets.push(clockElement.querySelector(".prism-stack-date"))
      } else if (style === "metro-panel") {
        dateTargets.push(clockElement.querySelector(".metro-panel-date"))
      } else if (style === "aurora-ribbon") {
        dateTargets.push(clockElement.querySelector(".aurora-ribbon-weekday"))
        dateTargets.push(clockElement.querySelector(".aurora-ribbon-date"))
      } else if (style === "bento") {
        dateTargets.push(clockElement.querySelector(".bento-side-tile"))
      } else if (style === "lunar-orbit") {
        dateTargets.push(clockElement.querySelector(".lunar-orbit-weekday"))
        dateTargets.push(clockElement.querySelector(".lunar-orbit-date-line"))
      } else if (style === "cartoon") {
        dateTargets.push(clockElement.querySelector(".cartoon-weekday"))
        dateTargets.push(clockElement.querySelector(".cartoon-date"))
      } else if (style === "custom-angle") {
        dateTargets.push(clockElement.querySelector(".custom-angle-date"))
      } else if (style === "split-pill") {
        dateTargets.push(clockElement.querySelector(".split-pill-date-col"))
        dateTargets.push(clockElement.querySelector(".split-pill-divider"))
      } else if (style === "clock-3d") {
        dateTargets.push(clockElement.querySelector(".clock-3d-date"))
      } else if (style === "satellite") {
        dateTargets.push(clockElement.querySelector(".sat-date"))
      } else if (style === "audio-wave") {
        dateTargets.push(clockElement.querySelector(".aw-date"))
      } else if (style === "glass-float") {
        dateTargets.push(clockElement.querySelector(".gf-date"))
      } else if (style === "macos-vintage") {
        dateTargets.push(clockElement.querySelector(".omp-date-line"))
        dateTargets.push(clockElement.querySelector(".omp-sys-info"))
      } else if (style === "aquarium") {
        dateTargets.push(dateElement)
      }
    }
  }

  // Apply effect to filtered valid targets
  clockTargets
    .filter((el) => el !== null)
    .forEach((el) => applyHuePerCharacter(el, 18))
  dateTargets
    .filter((el) => el !== null)
    .forEach((el) => applyHuePerCharacter(el, 198))
}

