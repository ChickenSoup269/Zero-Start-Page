    if (settings.accentColor) {
      document.documentElement.style.setProperty(
        "--accent-color",
        settings.accentColor,
      )
      // Dynamic contrast color for accent background
      const contrastColor =
        getContrastYIQ(settings.accentColor) === "black" ? "#1a1a2e" : "#ffffff"
      document.documentElement.style.setProperty(
        "--accent-contrast-color",
        contrastColor,
      )

      const rgb = hexToRgb(settings.accentColor)
      if (rgb) {
        document.documentElement.style.setProperty(
          "--accent-color-rgb",
          `${rgb.r}, ${rgb.g}, ${rgb.b}`,
        )
      }

      // Ensure Unsplash random button icon has contrast
      if (DOM.unsplashRandomBtn) {
        const icon = DOM.unsplashRandomBtn.querySelector("i")
        if (icon) {
          icon.style.color = getContrastYIQ(settings.accentColor) === "black" ? "rgba(0,0,0,0.8)" : "#ffffff"
        }
      }
    }