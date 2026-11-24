# Game foundation — Requirements (INITIAL DRAFT)

> This draft is provided as a starter. The team must review and refine it using Kiro IDE's spec-driven workflow. It does not by itself prove that Kiro executed any task.

## Objective

Deliver a compact, original browser horror game demonstrating a modern reinterpretation of VHS playback and arcade interactions. Three contributors develop independent modules that communicate through one typed game-state contract.

## Functional requirements

1. **World module:** WHEN the player opens the application, THE SYSTEM SHALL show an explorable compact 3D archive with an identifiable CRT station and arcade station. (Scaffold: static prototype only.)
2. **Controls:** WHEN the player presses WASD and moves the mouse, THE SYSTEM SHALL control player movement and camera with collision constraints. (Not yet implemented.)
3. **Station interaction:** WHEN the player approaches an interactable station and presses E, THE SYSTEM SHALL open the corresponding interaction UI. (Scaffold: mouse click prototype.)
4. **VHS:** WHEN the player inserts the first tape into the CRT, THE SYSTEM SHALL allow play, pause, rewind and inspection of a clue. (Scaffold: label inspection only.)
5. **Unlock gate:** WHEN the VHS clue has been recorded, THE SYSTEM SHALL unlock the arcade game.
6. **Snake:** WHEN the player starts the arcade, THE SYSTEM SHALL run an original deterministic Snake game with keyboard input, win/lose states and a result event. (Not yet implemented.)
7. **Memory Loop:** WHEN the arcade win event is accepted, THE SYSTEM SHALL visibly alter the 3D scene and unlock the final story beat.
8. **Persistence:** WHEN the page reloads after valid progress, THE SYSTEM SHALL restore the versioned local save without losing recorded clues or arcade results.
9. **Safe loading:** IF saved data is malformed or unsupported, THE SYSTEM SHALL recover to a valid starting state without crashing.
10. **Accessibility:** WHEN reduced visual effects are selected, THE SYSTEM SHALL avoid intense flashing and provide readable interaction feedback.

## Non-functional requirements

- English in public UI, docs and source comments.
- No copyrighted media without explicit permission/license.
- Smooth basic rendering on standard desktop hardware; measure frame rate before committing to a performance target.
- No authentication, cloud backend, multiplayer or complex AI enemy for the MVP.
- Public HTTPS deployment and installation instructions before Devpost submission.

## Acceptance path

Start game -> explore archive -> inspect and play VHS -> discover clue -> unlock arcade -> win Snake -> world changes -> discover ending -> reload preserves progress.
