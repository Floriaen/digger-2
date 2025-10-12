# Camera System Specification

Technical specification for the CameraSystem rework.

---

## Overview

The CameraSystem manages viewport transformation, including position, zoom, smooth following, and world boundary constraints.

---

## Core Features

### 1. Zoom

**Purpose**: Scale factor for world-to-screen transformation.

**API**:
```javascript
camera.setZoom(2.5); // Set target zoom level
camera.zoom;         // Current zoom (smoothly interpolated)
camera.targetZoom;   // Target zoom level
```

**Behavior**:
- Zoom smoothly interpolates from current to target using lerp (factor: 0.1)
- Higher zoom = more zoomed in (smaller visible area)
- Formula: `viewportWidth = canvasWidth / zoom`

**Example**:
```javascript
// Canvas: 800x600, Zoom: 2.0
// Visible world area: 400x300 pixels
```

---

### 2. Bounds (World Constraints)

**Purpose**: Define the playable world area. Camera cannot show regions outside these bounds.

**API**:
```javascript
camera.setBounds(minX, minY, maxX, maxY);
camera.bounds; // { minX, minY, maxX, maxY }
```

**Behavior**:
- Bounds are in world coordinates
- If no bounds set, camera is unconstrained (default: null)
- Clamping applies AFTER calculating follow target

**Example**:
```javascript
// World: 3200x1600 pixels (200x100 tiles)
camera.setBounds(0, 0, 3200, 1600);
// Camera can never show negative coordinates or beyond 3200x1600
```

---

### 3. Smooth Follow (with Interpolation)

**Purpose**: Camera smoothly tracks a target entity with lag/easing.

**API**:
```javascript
camera.follow(entity, lerpFactor = 0.1);
camera.followTarget; // Current entity being followed (null if none)
camera.followLerp;   // Interpolation speed (0-1)
```

**Behavior**:
- Camera position lerps towards entity position each frame
- `lerpFactor` controls follow speed:
  - 0.1 = slow, smooth follow (10% per frame)
  - 0.5 = fast follow (50% per frame)
  - 1.0 = instant snap (no lag)
- If `followTarget` is null, camera is static

**Example**:
```javascript
camera.follow(playerEntity, 0.1);
// Camera moves 10% closer to player each frame
// Takes ~20 frames to "catch up" (smooth lag effect)
```

---

### 4. Clamped Follow (Bounds Constraint)

**Purpose**: Respect world bounds while following. Camera "sticks" to edges when target is near boundaries.

**Behavior**:
1. Calculate target position (center on entity)
2. Calculate viewport edges based on zoom
3. Clamp viewport to stay within bounds
4. Lerp current position towards clamped target

**Edge Cases**:
- **Center of world**: Camera follows smoothly, entity stays centered
- **Near left edge**: Camera stops at `minX`, entity moves off-center (right side of screen)
- **Near right edge**: Camera stops at `maxX`, entity moves off-center (left side of screen)
- **World smaller than viewport**: Camera centers on world, shows empty space

**Clamping Formula**:
```javascript
viewportWidth = canvasWidth / zoom;
viewportHeight = canvasHeight / zoom;

// Ensure viewport stays within bounds
clampedX = clamp(targetX,
  -(maxX - viewportWidth),  // Right edge limit
  -minX                     // Left edge limit
);
```

**Example Scenario**:
```javascript
// Setup
canvas: 800x600
zoom: 2.0
bounds: { minX: 0, minY: 0, maxX: 3200, maxY: 1600 }
viewportSize: 400x300 (canvas / zoom)

// Player at (100, 500) - near left edge
targetX = 400 - 100 = 300  // Try to center player
clampedX = clamp(300, -2800, 0) = 0  // Hit left boundary!
// Result: Camera shows x: 0-400, player appears at x=100 (off-center)

// Player at (1600, 500) - center of world
targetX = 400 - 1600 = -1200
clampedX = clamp(-1200, -2800, 0) = -1200  // Within bounds
// Result: Camera shows x: 1400-1800, player centered at x=1600
```

---

## Implementation Details

### Properties

```javascript
// Position (world offset)
this.x = 0;              // Current X offset
this.y = 0;              // Current Y offset
this.targetX = 0;        // Target X offset (before lerp)
this.targetY = 0;        // Target Y offset (before lerp)

// Zoom
this.zoom = 1.0;         // Current zoom level
this.targetZoom = 1.0;   // Target zoom level

// Bounds
this.bounds = null;      // { minX, minY, maxX, maxY } or null

// Follow
this.followTarget = null;     // Entity to follow (or null)
this.followLerp = 0.1;        // Interpolation factor (0-1)
this.followOffsetX = 0;       // Horizontal offset from center
this.followOffsetY = 0;       // Vertical offset from center
```

### Methods

```javascript
/**
 * Set world bounds
 * @param {number} minX - Minimum world X
 * @param {number} minY - Minimum world Y
 * @param {number} maxX - Maximum world X
 * @param {number} maxY - Maximum world Y
 */
setBounds(minX, minY, maxX, maxY)

/**
 * Set zoom level
 * @param {number} zoom - Target zoom (smoothly interpolated)
 */
setZoom(zoom)

/**
 * Follow an entity with smooth interpolation
 * @param {Entity|null} entity - Entity to follow (null to stop following)
 * @param {number} lerpFactor - Interpolation speed (0-1, default 0.1)
 * @param {number} offsetX - Horizontal offset from center (default: canvas width / 2)
 * @param {number} offsetY - Vertical offset from center (default: custom offset)
 */
follow(entity, lerpFactor = 0.1, offsetX = null, offsetY = null)

/**
 * Get camera transform for rendering
 * @returns {{x: number, y: number, zoom: number}}
 */
getTransform()
```

### Update Loop Logic

```javascript
update(deltaTime) {
  // 1. Smooth zoom interpolation
  this.zoom = lerp(this.zoom, this.targetZoom, 0.1);

  // 2. Calculate target position (if following)
  if (this.followTarget) {
    // Target: center entity at offset position
    this.targetX = this.followOffsetX - this.followTarget.x;
    this.targetY = this.followOffsetY - this.followTarget.y;

    // 3. Apply bounds clamping (if bounds exist)
    if (this.bounds) {
      const viewportWidth = canvasWidth / this.zoom;
      const viewportHeight = canvasHeight / this.zoom;

      this.targetX = clamp(
        this.targetX,
        -(this.bounds.maxX - viewportWidth),
        -this.bounds.minX
      );
      this.targetY = clamp(
        this.targetY,
        -(this.bounds.maxY - viewportHeight),
        -this.bounds.minY
      );
    }
  }

  // 4. Smooth lerp to target
  this.x = lerp(this.x, this.targetX, this.followLerp);
  this.y = lerp(this.y, this.targetY, this.followLerp);
}
```

---

## Usage Examples

### Basic Setup with Player Following

```javascript
const camera = game.components.find(c => c instanceof CameraSystem);
const player = game.components.find(c => c instanceof PlayerSystem);

// Set world bounds (200x100 tiles at 16px)
camera.setBounds(0, 0, 3200, 1600);

// Follow player with smooth lag
camera.follow(player, 0.1,
  CANVAS_WIDTH / 2,  // Center horizontally
  200                // 200px from top vertically
);

// Set zoom level
camera.setZoom(3.0);
```

### Manual Camera Control (No Follow)

```javascript
// Stop following
camera.follow(null);

// Manually position camera
camera.targetX = -1000;
camera.targetY = -500;
```

### Dynamic Zoom Based on Depth

```javascript
// Auto-adjust zoom as player digs deeper
update(deltaTime) {
  const player = game.components.find(c => c instanceof PlayerSystem);
  const depthTiles = player.y / TILE_HEIGHT;
  const zoomLevel = 2.0 + Math.min(depthTiles / 12, 1.0);
  camera.setZoom(zoomLevel);
}
```

---

## Migration Notes

**Changes from Old System**:

1. **Follow API**: Replace hardcoded PlayerSystem lookup
   ```javascript
   // OLD: Automatic PlayerSystem detection
   const player = this.game.components.find(c => c.constructor.name === 'PlayerSystem');

   // NEW: Explicit follow() call
   camera.follow(player, 0.1, CANVAS_WIDTH / 2, CAMERA_OFFSET_Y);
   ```

2. **Bounds Required**: Systems must call `setBounds()` during init
   ```javascript
   // TerrainSystem.init() or Game.init()
   camera.setBounds(0, 0, worldWidth, worldHeight);
   ```

3. **Offset Configuration**: Follow offsets now explicit parameters
   ```javascript
   // OLD: Hardcoded CAMERA_OFFSET_Y
   this.targetY = CAMERA_OFFSET_Y - player.y;

   // NEW: Passed to follow()
   camera.follow(player, 0.1, canvasWidth / 2, CAMERA_OFFSET_Y);
   ```

---

## Testing Checklist

- [ ] Camera follows player smoothly in center of world
- [ ] Camera stops at left edge, player moves off-center
- [ ] Camera stops at right edge, player moves off-center
- [ ] Camera stops at top edge, player moves off-center
- [ ] Camera stops at bottom edge, player moves off-center
- [ ] Zoom in/out updates viewport clamping correctly
- [ ] Calling `follow(null)` stops following
- [ ] Manual camera positioning works without follow
- [ ] World smaller than viewport: camera centers correctly
