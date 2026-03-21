### [1.0.1] 2026-03-19


#### Unsplash Integration Improvements

- **Enhanced category accuracy**: Refactored Unsplash photo fetch with multi-tier priority system:
  - Tier 1: Per-category Unsplash Collections (configurable IDs)
  - Tier 2: Curated Topics endpoint (/topics/{id}/photos) for editorial-quality images
  - Tier 3: Random photos with per-category keywords
  - Tier 4: Search fallback with dynamic keyword pools
- **Rich keyword mapping**: Added 3-4 semantic keywords per category to ensure relevance
- **Featured category**: Added dynamic random category mixing (nature, technology, food, travel, architecture, fashion) for diverse discovery
- **Content filter**: Maintained `content_filter=high` across all API endpoints for quality assurance
- **New categories**: Added Featured, New Spring, Wallpapers to complement existing options

#### New Visual Effect: Storm Rain

- **StormRain effect**: Heavy rainfall with atmospheric storm elements
  - Dark animated storm clouds layer at top of screen
  - Multi-layer HD rain with wind drift and depth perception
  - **Frequent lightning bolts**: 3+ strikes per second with configurable intensity
  - Screen flash effect synchronized with lightning for immersion
  - Customizable rain color via color picker
  - Responsive wind simulation

#### Bug Fixes & Refinements

- Fixed Unsplash category default consistency (spring-wallpapers vs nature)
- Corrected architecture topic slug (architecture-interior → architecture-interiors)
- Added proper error handling for failed API calls with graceful fallbacks
- Ensured content_filter parameter applied consistently across random/search endpoints

### [1.0.0] - 2026-03-16

- Base extension you can see in releases version
