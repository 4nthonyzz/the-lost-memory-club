# Asset Provenance and Licenses

## 1. Zero-Asset Procedural Implementation (`src/world/**` — Merged on `main`)

The 3D exploration module merged into `main` ships **zero external third-party images, video clips, audio files (`.mp3`/`.wav`), 3D models (`.glb`/`.gltf`), or external web fonts**:

- **3D Geometry (`19,988` triangles):** Generated procedurally via TypeScript and React Three Fiber primitives (`src/world/scene/`).
- **Textures (`32` procedural canvases, `7.703 MiB`):** Synthesized at runtime using the HTML5 2D Canvas API (`src/world/scene/proceduralTextures.ts`).
- **24 Hz Arcade Attract Screens:** Rendered procedurally via Canvas 2D (`SNAKE.EXE`, `LAST EXIT`, `DEAD FREQUENCY`).
- **Soundtrack & Sound Effects:** Synthesized 100% procedurally in real time using the browser's native **Web Audio API** (`src/world/audio/`), ensuring original, copyright-safe audio for the YouTube demo and deployed build.

---

## 2. Bundled Media & Starter Assets

Before merging any new external asset from `src/arcade/`, `src/memories/`, or `src/ui/`, team members must record its filename, creator, exact source URL, license, and attribution requirements below.

| File | Creator | Source | License | Attribution / Notes |
| --- | --- | --- | --- | --- |
| `docs/assets/cover.png` | Project Starter Scaffold Authors | Included in initial *The Lost Memory Club* Kiroween 2026 starter scaffold | MIT License (Repository License) | Concept artwork used in `README.md` header; not loaded at runtime |

---

## 3. Open-Source Runtime & Build Dependencies (`package.json`)

All third-party libraries used by the application are standard open-source packages installed via npm under permissive licenses:

| Package | Purpose | License |
| --- | --- | --- |
| `react` / `react-dom` | UI component architecture and state rendering | MIT |
| `three` / `@react-three/fiber` / `@react-three/drei` | WebGL / Three.js 3D scene rendering | MIT |
| `typescript` | Static type checking | Apache-2.0 |
| `vite` | Development server and production bundler | MIT |
| `vitest` | Automated unit, budget, and module-boundary test runner | MIT |
