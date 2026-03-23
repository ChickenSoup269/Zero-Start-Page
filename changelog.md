### [1.0.1] - 2026-03-23

#### Thêm mới (Added)

- New visual effect: **StormRain**
  - Dark animated storm cloud layer at top.
  - Multi-layer HD rain with wind drift and depth.
  - Frequent lightning bolts with synchronized screen flash.
  - Customizable rain color and responsive wind simulation.
- New leaf skin options for settling leaves: **Cherry Blossoms, Plum Blossoms, Sakura Petals**.
- Added new Unsplash categories: **Featured, New Spring, Wallpapers**.
- Added richer semantic keyword mapping (3-4 keywords/category) for better image relevance.
- Added featured category mixing across nature, technology, food, travel, architecture, and fashion.

#### Sửa lỗi (Fixed)

- Fixed Unsplash default category inconsistency (`spring-wallpapers` vs `nature`).
- Fixed architecture topic slug (`architecture-interior` -> `architecture-interiors`).
- Added safer fallback handling when Unsplash API calls fail.
- Ensured `content_filter=high` is applied consistently across random/search endpoints.
- Reduced settling-leaf jitter when leaves reach the bottom.

#### Cập nhật (Updated)

- Refactored Unsplash fetch flow with 4-tier priority:
  - Tier 1: Per-category collections.
  - Tier 2: Curated Topics endpoint (`/topics/{id}/photos`).
  - Tier 3: Random photos with per-category keywords.
  - Tier 4: Search fallback with dynamic keyword pools.
- Increased Sakura Petal size for better visibility.
- Updated UI/i18n labels for new leaf skins (EN + VI).

#### Xóa (Removed)

- No removals in this version.

### [1.0.0] - 2026-03-16

- Base extension you can see in releases version
