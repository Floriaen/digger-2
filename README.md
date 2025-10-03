# Digger 2

A minimalist reimagining of the classic red-ball digging game. Carve your path through stratified terrain, navigate procedurally generated depths, and experience meditative excavation gameplay.

## Features

- **Component-based architecture** with vanilla JavaScript (ES6 modules)
- **Procedural terrain generation** using stratified noise and caverns
- **Progressive difficulty** with mud variants (HP 1→5) and rare indestructible rocks
- **Minimalist aesthetic**: orange sky, black mountains, fake-3D tiles
- **Mobile-first** design (web + mobile targets)

## Visual Style

- Orange gradient sky with silhouetted black mountains
- Green surface strip transitioning to underground darkness
- Fake-3D block rendering (16×25px tiles with depth caps)
- Red torus formations and lava lake finale

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run local development server:

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

## Controls

- **Arrow Keys**: Move left/right
- **Touch** (future): Left/right screen zones

## Project Structure

```
/src
  /components     → Game components (player, terrain, camera, etc.)
  /systems        → Core systems (input, rendering, physics)
  /terrain        → Procedural generation & block registry
  /rendering      → Sprite atlas, tile rendering utilities
  /utils          → Event bus, math helpers, config
  /core           → Base component class, game loop
/Sprite           → Game assets (sprite.png)
/Docs             → Specifications and development plan
```

## Development Milestones

- **Pre-M0**: Project setup & infrastructure ✓
- **M0**: Pure mud sandbox (HP=1 terrain, auto-dig, camera)
- **M1**: Navigation aids & falling solid mechanics
- **M2**: Full terrain variants (HP tiers, red torus, lava)
- **M3**: Visual polish & UX refinement
- **M4**: Stabilization & stretch features

See [DEVELOPMENT_PLAN.md](Docs/DEVELOPMENT_PLAN.md) for details.

## Tech Stack

- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas
- dat.GUI for debug controls
- ESLint (Airbnb style guide)

## License

MIT © Floriaen

## Acknowledgments

Inspired by classic digging games with a focus on minimalist aesthetics and procedural depth.
