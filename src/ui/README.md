# Shared narrative UI (Developer 3)

Presentational React components. They receive plain data through props and do not import from `src/memories/`, `src/world/` or `src/arcade/`. The App shell connects them to game state.

| Component | Purpose | Status |
| --- | --- | --- |
| `MemoryJournal` | Polaroid and file-card journal plus the Living Club atmosphere | prototype |
| `EndingScreen` | Ending choice and one Canvas animation per ending | prototype (pure helpers tested) |
| `CrtCorruptionOverlay` | Scanlines, glitch bars and CRT power-off | prototype |
| `SaveIndicator` | `idle`, `saving`, `saved`, `error` | prototype |
| `AccessibilitySettings` | Language (EN/ES), reduced distortion, mute | prototype |

## Preferences

`preferences.ts` stores `{ version: 1, language, reducedDistortion, muted }` under `lost-memory-club.preferences.v1`, separate from the game save. Loading repairs invalid fields and never throws. The default language is `en`. When no preference is saved, `reducedDistortion` starts from the browser's `prefers-reduced-motion` setting. `usePreferences()` loads, persists and updates the document language.

## Reduced distortion

With the option on, the components stop flashing and shaking, skip animated glitches, show ending scenes in their final frame and shorten the CRT power-off to a fade.
