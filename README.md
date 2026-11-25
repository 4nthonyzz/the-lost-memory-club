# THE LOST MEMORY CLUB

<div align="center">
  <img src="docs/assets/cover.png" alt="The Lost Memory Club - Retro Horror Concept Artwork" width="100%" />

  <h1>THE LOST MEMORY CLUB</h1>
  <p><em>Some memories should stay forgotten.</em></p>
  <p><strong>Kiroween 2026 · Resurrection Category</strong></p>
</div>

> **Development Status: Early Development — Not yet a finished or playable game.**
>
> This repository contains an initial development scaffold, a visual prototype, three isolated feature areas, a typed core event contract, initial Kiro specifications, and automated reducer tests. Gameplay, first-person exploration, actual VHS playback, and the ending remain to be implemented through Kiro IDE.

## About the Project

**The Lost Memory Club** is an original browser-based retro horror mystery developed for **Kiroween 2026**, proposed for the **Resurrection** category.

Explore a forgotten media archive, uncover a clue hidden in a VHS tape, play a haunted arcade game, and discover how recovered memories change the archive itself.

Inspired by 1990s media culture, the project combines retro aesthetics, psychological horror, environmental exploration, and interactive storytelling.

## Visual Preview

### Concept Artwork

The visual identity of the project draws inspiration from abandoned video rental stores, CRT televisions, VHS recordings, and classic arcade machines.

*The artwork above represents the intended atmosphere and visual direction of the game. It is not a screenshot of the current playable build.*

### In-Game Screenshots

Actual gameplay screenshots will be added as the main features are implemented and tested. We want to showcase real gameplay rather than represent planned features as completed functionality.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Application interface and component architecture |
| TypeScript | Type safety and application logic |
| Vite | Development environment and build tooling |
| Three.js / React Three Fiber | 3D rendering and basic scene prototype |
| HTML Canvas | Planned Snake arcade minigame |
| Web Audio API | Planned original audio and sound effects |
| LocalStorage | Planned versioned game progress |
| Vitest | Unit testing and reducer validation |
| Kiro IDE | Specification-driven development and AI-assisted implementation |

## Requirements

Before running the project, make sure you have installed:

- Node.js 20.19+ (or 22.12+).
- npm.

## Getting Started

Clone the repository and install its dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your browser.

## Testing and Validation

Run the following commands to validate the project:

**TypeScript validation**

```bash
npm run typecheck
```

**Automated tests**

```bash
npm test
```

**Production build**

```bash
npm run build
```

## Project Structure and Team Responsibilities

Development is organized into three main feature areas, with shared contracts maintained collaboratively.

| Feature Area | Directory | Responsibility |
|---|---|---|
| World and Exploration | `src/world/` | Developer 1: navigation, camera, collisions, interactables, and 3D optimization |
| Haunted Arcade | `src/arcade/` | Developer 2: Snake mechanics, results, deterministic rules, and tests |
| VHS, Narrative and UI | `src/memories/`, `src/ui/` | Developer 3: playback, clues, progression UI, and persistence |
| Shared Contracts and Reducer | `src/core/` | Changes must be reviewed and approved collaboratively |

All team members should use **Kiro IDE** for meaningful portions of planning, implementation, and testing.

Development should take place in separate feature branches, with changes integrated through reviewed pull requests.

For collaboration guidelines, see [`docs/TEAM_SETUP.md`](docs/TEAM_SETUP.md).

## Kiro and Spec-Driven Development

This starter is a **manually prepared development scaffold**. It is not evidence of prior Kiro execution.

The team will use Kiro IDE to implement the project through a structured, specification-driven workflow.

The development process includes:

1. Reviewing and refining the initial specifications.
2. Defining technical designs and implementation tasks.
3. Implementing features incrementally in their assigned modules.
4. Testing functionality and validating integration.
5. Reviewing changes before merging them into the main development branch.

The `.kiro/` directory must remain tracked in Git.

**Important project guidelines:**

- Do not add `.kiro/` to `.gitignore`.
- Preserve actual Kiro hook outputs and relevant development evidence.
- Keep test results and reviewed pull requests as verifiable records.
- Avoid modifying shared contracts without team approval.

The initial specifications are located in:

```text
.kiro/
├── specs/
│   └── game-foundation/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── steering/
    ├── architecture.md
    └── product.md
```

## Minimum Viable Product (MVP)

The target MVP is intentionally limited to a scope achievable by a three-person development team.

The planned experience should support:

- Exploring one compact 3D archive.
- Recovering one clue through a VHS recording.
- Playing one complete original Snake minigame.
- Triggering a visible and persistent change in the environment.
- Completing a short narrative experience.

The focus is on delivering a cohesive, functional experience rather than introducing too many unfinished features.

## Licensing, Originality and Credits

The source code in this repository is licensed under the **MIT License**.

The project's original artwork, audio, and narrative will be documented separately.

Third-party libraries, tools, and assets must be recorded in [`docs/THIRD_PARTY_ASSETS.md`](docs/THIRD_PARTY_ASSETS.md), including:

- Asset or library name.
- Original source.
- Author or creator.
- Applicable license and usage permissions.

All submitted materials must be original or properly authorized for use. We will not copy copyrighted game characters, music, or film footage without permission.

Contributors and third-party creators must receive appropriate credit.

## Submission Status

Before the final Kiroween 2026 submission, the project must include:

- A public GitHub repository.
- A detected repository license.
- The committed `.kiro/` directory.
- Complete installation and execution instructions.
- A deployed version of the game.
- A YouTube demonstration video under three minutes, public or unlisted without a password.

The demonstration must present the essential gameplay and project functionality within the first three minutes, as only that portion will be reviewed.

**This repository is currently under development and is not yet a submission-ready application.**

---

*The Lost Memory Club — Some memories should stay forgotten.*
