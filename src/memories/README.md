# VHS, narrative and memories (Developer 3)

Status legend: **tested** = covered by Vitest, **prototype** = implemented and type-checked but not exercised in a browser or wired into `App.tsx` yet.

| Area | Files | Status |
| --- | --- | --- |
| Transport state machine (play, pause, rewind, fast forward, frame step, tracking, clue detection) | `restoration/` | tested |
| Story catalog, evaluator, EN/ES text, journal model | `fragments/` | tested |
| Subtitles, keyboard mapping, visual parameters | `subtitles.ts`, `keyboardControls.ts`, `vhsVisuals.ts` | tested |
| Procedural audio (gain and filter rules) | `audio/vhsAudio.ts` | pure rules tested, Web Audio graph is prototype |
| CRT/VHS player (Canvas 2D + CSS) | `VhsPlayer.tsx`, `VhsPlayer.css`, `vhsRenderer.ts` | wired into `App.tsx`; not yet checked in a browser |
| Session flags and demo gates | `session.ts` | tested |

## Integration contract

`VhsPlayer` is controlled by props: `tape`, `language`, `reducedDistortion`, `muted`, `onClueDetected`, `onClose`. `App.tsx` maps each `ClueDetection` to a core `GameEvent` (`VHS_CLUE_FOUND`) through `clueEventFor`, except archive-09 perfect tracking, which `App` keeps as session state through `recordPerfectTracking`. Loading Archive 09 dispatches `MEMORY_RESTORED` once the arcade is won. The player never writes to LocalStorage.

`buildJournalModel(gameState, extraProgress, language)` returns plain data for the journal, the club atmosphere and the unlocked endings. Its shapes match the view models in `src/ui/viewModels.ts` structurally, so the App shell can pass them straight to the UI components. This module does not import from `src/ui/`.

## Content scope

Only act 1 (`tape-001`, `crt-frequency`, `SNAKE.EXE`) is reachable with `GameState` v1. Acts 2 and 3 and the secret ending are catalog data that need a reviewed change to `src/core/` before they can be played.

All art and audio are generated in code. No external assets are used.
