# World Exploration: App.tsx Integration Notes (P1 `inputEnabled`)

Documentation only (task 9.9). No code is changed by this document.

## Status

- P1 is approved as an **integration proposal only**.
- `src/App.tsx` is **NOT modified** and must not be modified until the team coordinates (see the checklist below).
- Implemented in the world module: the optional `inputEnabled?: boolean` prop on `WorldScene` (`src/world/WorldScene.tsx`) and the mode reducer support for it (`src/world/logic/inputMode.ts`). It is covered by unit and component-level tests.
- Pending in App: passing the prop. The world-side prop has **not been verified end-to-end in the running App**, because App does not pass it today.

## Proposed change in `src/App.tsx` (not applied)

Current line:

```tsx
<WorldScene onInspect={interact} memoryShifted={memoryShifted} />
```

Proposed line:

```tsx
<WorldScene inputEnabled={station === null} onInspect={interact} memoryShifted={memoryShifted} />
```

No other App change is needed. `interact`, `station`, `message` and the panels stay as they are.

## Backward compatibility

- The prop is optional and additive. `onInspect` and `memoryShifted` keep their names and types. `StationId` is unchanged.
- If App never passes it, the world behaves as before (case c).

## Ownership rules

- `App.tsx` remains the source of truth for panel-open state (`station`) and unlock state (`hasClue`).
- The world never reads `GameState` and does not know whether the arcade is locked. It always calls `onInspect` for the targeted station.
- The world never requests pointer lock automatically. Pointer lock is requested only from a user gesture (canvas click, or Enter/E while the wrapper has focus).

## Expected sequences

### (a) Unlocked VHS or arcade request (with P1 applied)

1. Player presses E near a station. The world calls `onInspect(stationId)`.
2. `interact` sets `station`, so `inputEnabled` becomes `false`.
3. The world suspends input, clears held keys and releases pointer lock. The panel-open notice is shown.
4. The player closes the panel. `station` becomes `null` and `inputEnabled` becomes `true`.
5. The world shows the capture overlay. It does **not** re-lock the pointer. The player clicks the view to re-capture.

### (b) Locked arcade request (with P1 applied)

1. Player presses E near the arcade. The world calls `onInspect('arcade')`.
2. `interact` sets only the status message and leaves `station` as `null`. The status line shows `ARCADE LOCKED · Recover the VHS clue first.`
3. `inputEnabled` stays `true`. The world releases pointer lock but stays usable (keyboard movement and look still work).
4. One click on the view re-captures the pointer.

### (c) Prop absent (current App, no change)

1. Player presses E near a station. The world calls `onInspect(stationId)`, then suspends itself locally and releases pointer lock.
2. The player resumes with a click, Enter or E on the capture overlay. There are no timers.
3. **Known limitation:** the world cannot tell when the panel closed, so it may resume while a panel is still open, and it cannot distinguish the locked case from the unlocked case.

## Question for the App.tsx owner

Can we change the single `<WorldScene ... />` line in `App.tsx` to add `inputEnabled={station === null}`? Do you want any extra condition (for example, also disabling input during reset)?

## Team coordination checklist

- [ ] Identify the App.tsx owner and confirm they agree to the one-line change.
- [ ] Agree on when it is edited (after the world branch is merged, or on a separate short branch).
- [ ] Decide who edits `src/App.tsx` (the owner, or the world developer with the owner's approval).
- [ ] Review: the owner reviews the diff, which must be limited to adding the `inputEnabled` prop.
- [ ] After merge, run the manual check of sequences (a) and (b) in the running App and record the result. Until then, end-to-end behavior is unverified.
