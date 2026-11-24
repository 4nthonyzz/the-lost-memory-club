# THE LOST MEMORY CLUB

*Some memories should stay forgotten.*

> **Status: initial development scaffold, not a finished or playable game.** This codebase provides a visual prototype, three isolated feature areas, a typed core event contract, initial specifications, and automated reducer tests. Gameplay, first-person exploration, actual VHS playback, and the ending remain to be implemented with Kiro IDE.

An original browser-based retro horror mystery for **Kiroween 2026**, proposed for the **Resurrection** category. Explore a forgotten media archive, uncover a clue in a VHS tape, play a haunted arcade game, and discover how recovered memories change the archive itself.

## Stack

- React + TypeScript + Vite
- Three.js via React Three Fiber (basic scene prototype)
- HTML Canvas planned for the Snake minigame
- Web Audio API planned for original audio
- LocalStorage for versioned game progress
- Vitest for unit tests; property-based testing will be added during Kiro implementation

## Requirements

Node.js 20.19+ (or 22.12+) and npm.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To validate:

```bash
npm run typecheck
npm test
npm run build
```

## Project areas and team roles

| Area | Directory | Assigned responsibility |
| --- | --- | --- |
| World and exploration | `src/world/` | Developer 1: navigation, camera, collisions, interactables, 3D optimization |
| Haunted arcade | `src/arcade/` | Developer 2: Snake mechanics, results, deterministic rules, tests |
| VHS, narrative and UI | `src/memories/`, `src/ui/` | Developer 3: playback, clues, progression UI, persistence |
| Shared contracts and reducer | `src/core/` | Must be approved together before modification |

All participants should use Kiro IDE for meaningful portions of planning, implementation and testing. Work in separate feature branches and merge via reviewed pull requests. See [`docs/TEAM_SETUP.md`](docs/TEAM_SETUP.md).

## Hackathon workflow

This starter is **a manually prepared scaffold**; it is *not* evidence of prior Kiro execution. Open it in Kiro IDE, review and refine the files in `.kiro/specs/game-foundation/`, and carry out real spec-driven work. Keep `.kiro/` tracked and preserve useful evidence (actual hook outputs, test results and reviewed PRs). Do not add `.kiro/` to `.gitignore`.

## MVP definition

The shipped game should support: explore one compact 3D archive, recover one VHS clue, play one complete original Snake minigame, trigger a visible persistent world change and finish a short narrative. Scope is intentionally narrow for a three-person team.

## Licensing and originality

Code in this repository is MIT-licensed. The project's original artwork, audio and story will be documented separately. Third-party libraries and assets must be recorded in [`docs/THIRD_PARTY_ASSETS.md`](docs/THIRD_PARTY_ASSETS.md) with their sources, authors and applicable licenses. Do not copy copyrighted game characters, music or films.

## Submission status

The GitHub repository must be public with a detected license, a committed `.kiro/` directory and complete run instructions. The deployed game and public YouTube demo shorter than three minutes will be added before the Kiroween 2026 deadline. This repository is not yet a submission-ready application.
