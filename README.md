# Glass Marble Labyrinth Maze

A realistic, physics-driven 3D wooden labyrinth game built with **Next.js 15**, **Three.js**, **React Three Fiber**, and **Rapier 3D Physics**. Tilt the handcrafted wooden board with mechanical precision, roll the glass marble through challenging solvable mazes, and reach the brass goal tile.

---

## Features

### 1. Precision 3D Physics & Continuous Collision Detection
- **Rapier 3D WebAssembly Engine**: High-fidelity rigid-body dynamics, continuous collision detection (CCD), and accurate rolling friction.
- **Frame-Based Lerp Tilting**: Smooth exponential angle smoothing (`1.0 - Math.exp(-LERP_SPEED * dt)`) simulates brass lead-screw mechanical knobs and eliminates abrupt physics velocity spikes or jumping.
- **Interlocking Cabinet Geometry**: Solid analytical floor slab and full-height interlocking hardwood rims ensure zero marble dropouts or edge snagging.
- **Dual Collider Modes**: Switch between precision welded trimeshes and analytical convex hull polyhedra.

### 2. Optical Glass Marble & Dynamic Shader Palettes
- **Physically Based Transmission**: Rendered with Three.js `MeshPhysicalMaterial` featuring optical refraction (IOR 1.52), surface dispersion, subtle internal air bubbles, and swirling colored glass filaments.
- **Dynamic Shader Color Palettes**: Custom GLSL vertex and fragment shaders for the internal swirl ribbons with real-time uniform interpolation across five artisanal glass palettes:
  - *Ocean Blue*: Deep azure, cyan, and marine tones with cool transmission.
  - *Ruby Fire*: Venetian ruby crimson and fiery amber ribbons.
  - *Emerald Forest*: Rich deep jade and viridian swirls with mint accents.
  - *Amethyst Twilight*: Royal purple and twilight orchid filaments.
  - *Classic Venetian*: Heritage tricolor ribbons (crimson, cobalt, and amber).
- **Contact Shadows & Highlights**: Environment reflections and directional specular highlights that react realistically as the marble rolls.

### 3. Solvable Maze Generation & Curated Presets
- **Guaranteed Solvable**: Procedural maze generator utilizing depth-first search with backtracking, dead-end branches, and verified pathfinding from start to goal.
- **Difficulty Presets**: Instant access to curated layouts across multiple difficulties (Beginner, Intermediate, Master) or randomized seed generation.

### 4. Interactive Craftsmanship & Studio Lighting
- **Procedural Wood & Brass Textures**: Procedurally synthesized wood grain, box-joint outer cabinet frame, and rotating brass mechanical knobs.
- **Lighting Presets**: Toggle between *Workshop Warmth*, *Studio Daylight*, and *Golden Sunset* environments.
- **Audio Synthesis**: Interactive spatial sound effects for marble rolling hum, wooden wall impacts, and goal completion fanfare.

### 5. Multi-Device Controls
- **Keyboard Navigation**: `W / A / S / D` or `Arrow Keys` for board tilting.
- **Mobile & Touch**: On-screen virtual joystick and directional controls for tablet and mobile gameplay.
- **Camera Options**: Toggle slow-motion inspection or cinematic auto-rotation around the cabinet.

---

## Controls

| Action | Primary Input | Alternative Input |
| :--- | :--- | :--- |
| **Tilt Board Forward** | `W` | `Up Arrow` |
| **Tilt Board Backward** | `S` | `Down Arrow` |
| **Tilt Board Left** | `A` | `Left Arrow` |
| **Tilt Board Right** | `D` | `Right Arrow` |
| **Reset Marble** | `R` or Top Bar Button | Reset button on HUD |
| **Orbit Camera** | Click & Drag | Touch & Drag |
| **Zoom Camera** | Scroll Wheel | Pinch to Zoom |

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19, TypeScript)
- **3D Graphics**: [Three.js](https://threejs.org/) & [React Three Fiber](https://r3f.docs.pmnd.rs/) (`@react-three/fiber`, `@react-three/drei`)
- **Physics**: [Rapier 3D](https://rapier.rs/) (`@react-three/rapier`, `@dimforge/rapier3d-compat`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons & Animation**: [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/)

---

## Getting Started

### Prerequisites
- Node.js 20+ installed
- npm, pnpm, or bun

### Installation

1. Clone or download the repository:
   ```bash
   git clone <repo-url>
   cd <repo-name>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Building for Production

To create an optimized production build:
```bash
npm run build
npm run start
```
