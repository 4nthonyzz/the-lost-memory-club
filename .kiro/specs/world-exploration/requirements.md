# Requirements Document

## Introduction

This document specifies the 3D world and exploration area (Area 1, Developer 1, branch `feature/world-exploration`) of THE LOST MEMORY CLUB. The World_Module replaces the static click-to-inspect prototype in `src/world/WorldScene.tsx` with an original, atmospheric, first-person environment set inside an abandoned 1990s VHS archive. The environment contains a compact reception and VHS archive room, a small arcade area with an interactive arcade cabinet, a CRT television with a VHS player, shelves, abandoned furniture, doors and environmental details.

The player moves with WASD, looks with the mouse through pointer lock, collides with walls and objects, and interacts with stations by pressing E while near and facing them. When `memoryShifted` becomes true, the environment changes visibly.

The World_Module only requests interactions. The App_Shell decides whether an interaction is allowed (for example, the arcade stays locked until the VHS clue is found) and owns the message that explains a lock. The World_Module does not implement Snake, VHS playback, story progression or persistence, and it has no knowledge of unlock status.

While a station panel is open, the World_Module suspends its own input. With the current props, the World_Module enters an Inspecting_State when it calls `onInspect`, and the user resumes explicitly in the world. An optional, backward-compatible `inputEnabled` prop (proposal P1) is approved as an integration proposal only. Its implementation in `src/App.tsx` still requires team coordination, and `src/App.tsx` stays unmodified for now (Requirement 11 and Requirement 17). When `inputEnabled` is supplied, the prop governs the suspension state. The World_Module never suspends itself permanently because of an `onInspect` call, and it never requests Pointer_Lock without a valid user gesture.

### Milestone traceability

Milestone 1 is the minimum shippable slice: one small, enclosed, playable room built from primitive low-poly geometry. Milestones M2 to M6 are incremental additions that extend M1 without changing its public behavior or the WorldSceneProps contract.

| Milestone | Name | Requirements |
|-----------|------|--------------|
| M1 | Playable 3D room (minimum shippable slice) | 19 (defines the M1 scope and the subset of Requirements 2, 3, 4, 6, 7, 8 and 11 that M1 satisfies) |
| M2 | Full movement, camera and pointer-lock fallback | 3, 4, 5 |
| M3 | Full layout, collision, interactions and feedback ownership | 1, 6, 7, 8, 11, 20 |
| M4 | Environmental effects and full Memory_Shift | 9, 10 |
| M5 | Blender/GLB integration | 12 |
| M6 | Testing and optimization | 13, 14, 15 |

Requirements 16 (integration contracts), 17 (file boundaries and proposed changes), 18 (out of scope) and 19 (M1 scope boundary) apply to all milestones. Criteria in Requirements 1 to 15 and 20 that exceed the M1 scope defined in Requirement 19 are delivered in the milestone shown in this table.

### Status convention

Per the product steering, no feature is claimed as working until verified. Every requirement below is **planned**. The project owner has approved the initial numeric parameters in this document (walking speed, Player_Radius, Interaction_Range, Interaction_Cone, pitch limit, keyboard look speed, graphics limits and performance targets) and the Milestone 1 scope defined in Requirement 19 as the starting point for implementation. Numeric values for walking speed, Interaction_Range, Interaction_Cone, Player_Radius, keyboard look speed, graphics limits and performance targets are **initial values** approved for the first implementation and **validated in testing**. They may be adjusted after testing, and performance targets in Requirement 14 must be measured before they are reported as achieved.

## Glossary

- **World_Module**: The code in `src/world/` that renders the 3D environment and handles first-person exploration.
- **WorldScene**: The React component exported from `src/world/WorldScene.tsx` that is the public entry point of the World_Module.
- **WorldSceneProps**: The props contract of WorldScene: `{ onInspect: (station: StationId) => void; memoryShifted: boolean }`, plus any optional props approved under Requirement 17.
- **App_Shell**: The `App` component in `src/App.tsx`, which owns unlock rules, status messages and station panels.
- **StationId**: The type `'vhs' | 'arcade'` defined in `src/core/contracts.ts`.
- **Station**: An interactable object in the world identified by a StationId. The CRT television with VHS player is the `vhs` Station. The arcade cabinet is the `arcade` Station.
- **Player**: The first-person viewpoint controlled by the user.
- **Archive_Room**: The compact reception and VHS archive room containing the `vhs` Station.
- **Arcade_Area**: The small area containing the `arcade` Station.
- **Walkable_Area**: The set of floor positions the Player may occupy without intersecting a Collider.
- **Collider**: A 2D (floor-plane) shape representing a wall or object that blocks Player movement.
- **Player_Radius**: The radius of the circular footprint of the Player used for collision tests. Initial value: 0.35 world units, validated in testing.
- **Movement_Input**: The set of currently pressed movement keys (W, A, S, D, and the arrow keys as an alternative).
- **Look_Input**: Mouse movement delivered while pointer lock is active, or the keyboard look alternative defined in Requirement 5.
- **Pointer_Lock**: The browser Pointer Lock API state in which the mouse cursor is captured by the canvas.
- **Capture_Overlay**: The HTML/CSS element prompting the user to click the canvas to start mouse look.
- **Interaction_Target**: The Station selected by the targeting function as the one E would activate, or none.
- **Interaction_Range**: The maximum Player-to-Station distance within which a Station can be targeted. Initial value: 2.0 world units, validated in testing.
- **Interaction_Cone**: The maximum angle between the camera forward direction and the direction to a Station within which the Station can be targeted. Initial value: 35 degrees, validated in testing.
- **Interaction_Prompt**: The HTML/CSS hint shown when an Interaction_Target exists.
- **World_Wrapper**: The container element rendered by WorldScene (class `world-wrapper`) that holds the canvas and all world overlays.
- **Status_Line**: The App_Shell element with `role="status"` and class `scene-status`, rendered below the World_Wrapper, in which the App_Shell shows messages such as 'ARCADE LOCKED · Recover the VHS clue first.'.
- **inputEnabled**: The optional, backward-compatible WorldScene prop `inputEnabled?: boolean` (default true) from integration proposal P1. The App_Shell is the source of truth for whether a station panel is open and for whether the arcade is unlocked. The World_Module treats an absent prop as true and never infers either fact.
- **Inspecting_State**: The World_Module state in which Input_Suspension applies. WHERE `inputEnabled` is not supplied, the World_Module enters the Inspecting_State when it calls `onInspect` for a Station and leaves it only through a Resume_Action. WHERE `inputEnabled` is supplied, the prop alone governs the Inspecting_State: the World_Module is in the Inspecting_State exactly while `inputEnabled` is false, and an `onInspect` call never causes the Inspecting_State by itself.
- **Input_Suspension**: The condition in which the World_Module has released Pointer_Lock, cleared all held keys and pending mouse deltas, set Player velocity to zero, and ignores Movement_Input, Look_Input and E-key presses.
- **Resume_Action**: An explicit user action inside the World_Wrapper that ends the Inspecting_State when `inputEnabled` is not supplied: a click on the canvas or World_Wrapper, or a press of Enter or E while the World_Wrapper holds keyboard focus.
- **Valid_User_Gesture**: A user-initiated event that browsers accept for a Pointer_Lock request, such as a click on the canvas or a key activation (Enter or E) while the World_Wrapper holds keyboard focus. Mount, focus changes, visibility changes, prop changes and `memoryShifted` changes are not Valid_User_Gestures.
- **Ready_State**: The World_Module state in which Input_Enabled is true and Pointer_Lock is not active. The Capture_Overlay is displayed. Keyboard movement, keyboard look and prompts work according to the existing rules while the canvas holds keyboard focus, and the World_Module waits for a Valid_User_Gesture before it requests Pointer_Lock.
- **Input_Enabled**: The condition under which the World_Module processes Movement_Input, Look_Input and E-key presses. Input_Enabled is false during Input_Suspension, which is caused by the Inspecting_State.
- **Memory_Shift**: The visible environmental transformation applied while `memoryShifted` is true.
- **Reduced_Motion_Preference**: The user's `prefers-reduced-motion: reduce` setting.
- **Environmental_Effect**: Any animated or time-varying visual in the world, such as light flicker, screen glow pulsing, dust or CRT static.
- **Asset_Loader**: The World_Module code that loads optional GLB models.
- **Primitive_Fallback**: The low-poly geometry built from three.js primitives that is rendered when a GLB model is absent or fails to load.
- **Pure_Logic**: World_Module functions with no React, DOM, WebGL or timing dependencies, for movement, collision, look-angle clamping and interaction targeting.
- **Frame_Time**: The elapsed time per rendered frame, measured in milliseconds.
- **Reference_Hardware**: An ordinary laptop with integrated graphics rendering at 1280x720.

## Requirements

### Requirement 1: Archive Room Layout

**User Story:** As a player, I want a compact, believable abandoned VHS archive to explore, so that the game has an atmospheric place to play in.

#### Acceptance Criteria

1. THE WorldScene SHALL render an Archive_Room enclosed by floor, ceiling and four walls.
2. THE WorldScene SHALL render an Arcade_Area reachable from the Archive_Room on foot without leaving the Walkable_Area.
3. THE WorldScene SHALL render a CRT television with a VHS player as the `vhs` Station inside the Archive_Room.
4. THE WorldScene SHALL render an arcade cabinet as the `arcade` Station inside the Arcade_Area.
5. THE WorldScene SHALL render at least 3 shelves, at least 2 pieces of abandoned furniture and at least 2 doors.
6. THE WorldScene SHALL render at least 5 additional environmental detail objects, such as scattered tapes, posters, boxes, cables or a reception desk.
7. THE WorldScene SHALL keep all Station positions inside the Walkable_Area boundary reachable by the Player.
8. THE WorldScene SHALL use only original geometry, textures and colors authored for the project or assets recorded under Requirement 12.

### Requirement 2: Scene Rendering Foundation

**User Story:** As a player, I want the 3D scene to start reliably inside the existing page layout, so that I can begin exploring without setup.

#### Acceptance Criteria

1. THE WorldScene SHALL render inside the existing `section.scene-card` container of the App_Shell without requiring layout changes to the container.
2. WHEN WorldScene mounts, THE WorldScene SHALL place the Player at a defined start position inside the Walkable_Area facing the Archive_Room interior.
3. WHEN WorldScene unmounts, THE World_Module SHALL remove all event listeners it registered on `window`, `document` and the canvas element.
4. WHEN WorldScene unmounts, THE World_Module SHALL release Pointer_Lock if Pointer_Lock is active.
5. IF WebGL is unavailable when WorldScene mounts, THEN THE WorldScene SHALL display a text message stating that 3D rendering is unavailable, and THE WorldScene SHALL provide keyboard-operable buttons that call `onInspect('vhs')` and `onInspect('arcade')`.
6. IF a rendering error occurs inside the 3D canvas, THEN THE WorldScene SHALL display the same text message and buttons as in criterion 5 instead of leaving the area blank.

### Requirement 3: First-Person Movement

**User Story:** As a player, I want to walk around with WASD, so that I can explore the archive.

#### Acceptance Criteria

1. WHILE Input_Enabled is true and W is pressed, THE Player SHALL move forward along the horizontal projection of the camera direction.
2. WHILE Input_Enabled is true and S is pressed, THE Player SHALL move backward along the horizontal projection of the camera direction.
3. WHILE Input_Enabled is true and A or D is pressed, THE Player SHALL strafe left or right respectively, perpendicular to the camera direction.
4. THE World_Module SHALL accept the arrow keys as an alternative to WASD for Movement_Input.
5. WHEN two movement keys are pressed simultaneously, THE World_Module SHALL limit the resulting speed to the single-axis walking speed.
6. THE World_Module SHALL move the Player at an initial walking speed of 2.5 world units per second, independent of frame rate, validated in testing.
7. THE Player SHALL remain at a constant eye height above the floor.
8. IF the browser window loses focus, the document visibility changes to hidden, the canvas loses keyboard focus, or a `pointerlockchange` event occurs, THEN THE World_Module SHALL clear all pressed keys from Movement_Input and discard pending mouse deltas.
9. WHEN Input_Enabled changes from true to false, THE World_Module SHALL clear all pressed keys from Movement_Input, discard pending mouse deltas and set Player velocity to zero.
10. THE World_Module SHALL implement the movement step as Pure_Logic that accepts a position, a yaw angle, Movement_Input and an elapsed time, and returns a new position.
11. THE World_Module SHALL clamp a single frame's elapsed time to at most 100 ms before computing movement.

### Requirement 4: Mouse Look and Pointer Lock

**User Story:** As a player, I want to look around with the mouse, so that I can inspect the archive naturally.

#### Acceptance Criteria

1. WHEN the user clicks the canvas while Input_Enabled is true and Pointer_Lock is inactive, THE World_Module SHALL request Pointer_Lock on the canvas.
2. WHILE Pointer_Lock is active and Input_Enabled is true, THE World_Module SHALL rotate the camera yaw and pitch according to mouse movement deltas.
3. THE World_Module SHALL clamp the camera pitch to the range -80 degrees to +80 degrees.
4. THE World_Module SHALL wrap or normalize the camera yaw so that yaw values remain finite after any sequence of mouse movements.
5. THE World_Module SHALL ignore a single mouse movement delta whose magnitude exceeds 500 pixels on either axis.
6. WHILE Pointer_Lock is inactive and Input_Enabled is true, THE WorldScene SHALL display the Capture_Overlay with the text "Click to look around · Esc releases the mouse".
7. WHEN Pointer_Lock becomes active, THE WorldScene SHALL hide the Capture_Overlay.
8. WHEN the user presses Esc while Pointer_Lock is active, THE World_Module SHALL release Pointer_Lock and display the Capture_Overlay.
9. THE World_Module SHALL implement look-angle updates and pitch clamping as Pure_Logic.
10. THE World_Module SHALL request Pointer_Lock only in direct response to a Valid_User_Gesture, and SHALL not request Pointer_Lock on mount, on focus changes, on visibility changes, on `inputEnabled` changes or on `memoryShifted` changes.
11. IF a Pointer_Lock request is made and the browser rejects it, THEN THE World_Module SHALL remain in the Ready_State and SHALL not retry without a new Valid_User_Gesture.

### Requirement 5: Pointer Lock Fallback

**User Story:** As a player whose browser or device blocks pointer lock, I want an alternative way to look and move, so that I can still play the game.

#### Acceptance Criteria

1. IF the Pointer Lock API is unavailable in the browser, THEN THE World_Module SHALL enable the keyboard look alternative and display a hint describing the controls.
2. IF a Pointer_Lock request is denied or fails, THEN THE World_Module SHALL enable the keyboard look alternative and display a hint describing the controls.
3. WHILE the keyboard look alternative is enabled and Input_Enabled is true, THE World_Module SHALL rotate the camera yaw left and right when J and L are pressed respectively, and SHALL rotate the camera pitch up and down when I and K are pressed respectively.
4. THE World_Module SHALL provide a keyboard look alternative that remains available at all times, regardless of Pointer_Lock state, so that a player who never captures the mouse can still explore.
5. WHILE the keyboard look alternative is used, THE World_Module SHALL rotate the camera at an initial fixed angular speed of 90 degrees per second (validated in testing), independent of frame rate, subject to the pitch clamp in Requirement 4.
6. THE World_Module SHALL list every movement, look and interaction key in an on-screen controls hint that the user can read without Pointer_Lock.

### Requirement 6: Collision

**User Story:** As a player, I want walls and objects to block me, so that the world feels solid and I cannot leave the archive.

#### Acceptance Criteria

1. THE World_Module SHALL define one Collider for each wall, shelf, furniture piece, Station and doorframe-blocking object.
2. WHEN a movement step would place the Player circle of radius Player_Radius in overlap with a Collider, THE World_Module SHALL resolve the position so that the Player circle does not overlap the Collider.
3. WHEN a movement step is blocked along one axis, THE World_Module SHALL preserve the movement component along the other axis (wall sliding).
4. THE World_Module SHALL guarantee that, for every sequence of Movement_Input, yaw angles and elapsed times, the Player position remains inside the room bounds.
5. THE World_Module SHALL guarantee that, for every sequence of Movement_Input, yaw angles and elapsed times, the Player position never overlaps any Collider.
6. WHEN the elapsed time for a single frame is as large as the clamp in Requirement 3 criterion 11 and the walking speed is applied, THE World_Module SHALL still prevent the Player from passing through a Collider thinner than 0.2 world units.
7. IF a Player position at start or after a reset overlaps a Collider, THEN THE World_Module SHALL move the Player to the nearest non-overlapping position inside the Walkable_Area.
8. THE World_Module SHALL implement collision resolution as Pure_Logic that accepts a position, a proposed displacement, a Player_Radius and a list of Colliders, and returns a resolved position.
9. THE World_Module SHALL implement Player_Radius with an initial value of 0.35 world units, validated in testing.

### Requirement 7: Interaction Targeting

**User Story:** As a player, I want to interact with a Station by looking at it and pressing E, so that interactions feel deliberate.

#### Acceptance Criteria

1. THE World_Module SHALL select as Interaction_Target the nearest Station that is within Interaction_Range of the Player and within the Interaction_Cone of the camera forward direction.
2. IF no Station satisfies both Interaction_Range and Interaction_Cone, THEN THE World_Module SHALL set the Interaction_Target to none.
3. IF a Collider fully blocks the line of sight between the Player and a Station, THEN THE World_Module SHALL exclude that Station from selection.
4. WHEN two Stations are both eligible, THE World_Module SHALL select the Station with the smaller Player-to-Station distance.
5. WHEN E is pressed while Input_Enabled is true and an Interaction_Target exists, THE World_Module SHALL call `onInspect` exactly once with the StationId of the Interaction_Target and SHALL then enter the Inspecting_State (Requirement 11).
6. IF E is pressed and no Interaction_Target exists, THEN THE World_Module SHALL not call `onInspect`.
7. WHILE E is held down, THE World_Module SHALL call `onInspect` at most once per key press (key repeat events are ignored).
8. THE World_Module SHALL implement Interaction_Target selection as Pure_Logic that accepts the Player position, camera forward direction, Station definitions and Colliders, and returns a StationId or none.
9. THE World_Module SHALL be able to evaluate the Interaction_Target in no more than 1 ms per frame on Reference_Hardware (initial target, validated in testing).

### Requirement 8: Interaction Prompts

**User Story:** As a player, I want clear on-screen hints, so that I know what I can interact with and which keys to use.

#### Acceptance Criteria

1. WHILE an Interaction_Target exists and the World_Module is not in the Inspecting_State, THE WorldScene SHALL display an Interaction_Prompt naming the Station with fixed neutral text: "Press E to inspect the CRT television" for the `vhs` Station and "Press E to use the arcade cabinet" for the `arcade` Station.
2. WHEN the Interaction_Target becomes none, THE WorldScene SHALL remove the Interaction_Prompt within 1 frame of the change.
3. THE WorldScene SHALL render the Interaction_Prompt as HTML/CSS text that has a contrast ratio of at least 4.5:1 against its background.
4. THE WorldScene SHALL expose the Interaction_Prompt text to assistive technology through an ARIA live region with `role="status"`.
5. THE WorldScene SHALL keep the Interaction_Prompt visible without requiring a mouse pointer.
6. THE WorldScene SHALL display the same Interaction_Prompt text for a Station regardless of game progress, because the World_Module does not know the unlock rules (see Requirement 20).
7. THE WorldScene SHALL avoid duplicating the status messages that the App_Shell displays after `onInspect` is called.

### Requirement 9: Memory Shift Environmental Transformation

**User Story:** As a player, I want the world to visibly change after I win the arcade game, so that my action feels like it altered the memory.

#### Acceptance Criteria

1. WHEN `memoryShifted` changes from false to true, THE WorldScene SHALL apply the Memory_Shift to the environment without remounting the canvas or resetting the Player position.
2. WHILE `memoryShifted` is true, THE WorldScene SHALL render at least 4 visibly different environment properties compared with the unshifted state, including at least the lighting color, the wall or fog color, the screen emissive colors, and at least one changed or added set-dressing element.
3. WHILE `memoryShifted` is true, THE WorldScene SHALL keep all Colliders and Station positions identical to the unshifted state so that navigation is unchanged.
4. WHEN `memoryShifted` changes from false to true, THE WorldScene SHALL complete the visual transition within 3 seconds.
5. WHERE Reduced_Motion_Preference is active, THE WorldScene SHALL apply the Memory_Shift as an immediate change without an animated transition.
6. WHEN `memoryShifted` changes from true to false, THE WorldScene SHALL restore the unshifted environment.
7. WHEN WorldScene mounts with `memoryShifted` already true, THE WorldScene SHALL render the shifted environment from the first frame without playing the transition.
8. THE WorldScene SHALL derive the Memory_Shift appearance only from the `memoryShifted` prop.

### Requirement 10: Environmental Effects and Motion Safety

**User Story:** As a player sensitive to motion and flashing, I want atmospheric effects that remain comfortable, so that the horror does not cause discomfort.

#### Acceptance Criteria

1. THE WorldScene SHALL provide Environmental_Effects limited to light flicker, screen glow variation, dust motion and CRT static on the CRT television.
2. THE WorldScene SHALL limit any luminance change in Environmental_Effects to no more than 3 changes per second across a full-screen-equivalent area.
3. WHERE Reduced_Motion_Preference is active, THE WorldScene SHALL disable flicker, dust motion and CRT static animation and render static equivalents.
4. WHEN the Reduced_Motion_Preference value changes while WorldScene is mounted, THE WorldScene SHALL apply the new setting without remounting.
5. THE WorldScene SHALL not apply screen shake, camera roll or forced camera movement as part of any Environmental_Effect.
6. IF the proposed optional `reducedDistortion` prop is supplied and is true, THEN THE WorldScene SHALL behave as if Reduced_Motion_Preference were active.
7. THE WorldScene SHALL ensure that the room remains readable (floor, walls and Stations distinguishable) in both unshifted and shifted states.

### Requirement 11: Input Suspension, Keyboard Focus and App Panels

**User Story:** As a player, I want the world to stop reacting to keys and the mouse while a VHS or arcade panel is open, so that typing or playing in a panel does not move me, and so that I can return to the world on purpose.

#### Acceptance Criteria

1. WHEN the user clicks the canvas while the World_Module is not in the Inspecting_State, THE World_Module SHALL give the canvas keyboard focus so that WASD and E are received.
2. THE canvas SHALL be reachable by the Tab key and SHALL have an accessible label describing the world, its controls, and the fact that messages about station interactions appear in the Status_Line below the scene.
3. WHERE `inputEnabled` is not supplied, WHEN the World_Module calls `onInspect` for a Station, THE World_Module SHALL enter the Inspecting_State.
4. WHEN the World_Module enters the Inspecting_State, THE World_Module SHALL release Pointer_Lock, clear all pressed keys from Movement_Input, discard pending mouse deltas and set Player velocity to zero.
5. WHILE the World_Module is in the Inspecting_State, THE World_Module SHALL ignore Movement_Input, Look_Input and E-key presses.
6. WHILE the World_Module is in the Inspecting_State, THE WorldScene SHALL hide the Interaction_Prompt and the crosshair and SHALL display a "Panel open" notice that names the Resume_Action.
7. WHERE `inputEnabled` is not supplied, WHEN a Resume_Action occurs while the World_Module is in the Inspecting_State, THE World_Module SHALL leave the Inspecting_State, set Input_Enabled to true, enter the Ready_State and display the Capture_Overlay.
8. WHEN a key press performs a Resume_Action, THE World_Module SHALL not treat the same key press as an interaction request.
9. WHERE `inputEnabled` is not supplied, WHILE the World_Module is in the Inspecting_State, THE World_Module SHALL accept a Resume_Action at any time, SHALL remain in the Inspecting_State until a Resume_Action occurs, and SHALL not leave the Inspecting_State because of a timer.
10. THE project documentation SHALL state the known limitation that, while `inputEnabled` is not supplied, the World_Module cannot detect that the App_Shell closed the panel, so resuming is initiated by the user through a Resume_Action.
11. IF the browser window loses focus, the document visibility changes to hidden, or a `pointerlockchange` event occurs, THEN THE World_Module SHALL clear all pressed keys and discard pending mouse deltas (Requirement 3 criterion 8).
12. IF a keyboard event target is an input, textarea, select, button or contenteditable element, or is any element outside the World_Wrapper, THEN THE World_Module SHALL not use the event for movement, look or interaction, and SHALL not call `preventDefault` on it.
13. WHILE a Snake panel or any other App_Shell panel holds keyboard focus, THE World_Module SHALL not move the Player or trigger an interaction in response to the panel's keyboard input, including arrow keys, WASD and E.
14. WHEN the user presses Esc, THE World_Module SHALL not call `onInspect`.
15. THE World_Module SHALL call `preventDefault` only on key events that the World_Module uses for Requirement 3, Requirement 5 and Requirement 7 while the canvas holds focus and the World_Module is not in the Inspecting_State.
16. WHEN the supplied `inputEnabled` prop changes from true to false, THE World_Module SHALL enter the Inspecting_State immediately, release Pointer_Lock, clear all pressed keys, discard pending mouse deltas, set Player velocity to zero, ignore Movement_Input, Look_Input and E-key presses, hide the Interaction_Prompt and the crosshair, and display the neutral "Panel open" notice.
17. WHEN the supplied `inputEnabled` prop changes from false to true, THE World_Module SHALL leave the Inspecting_State without requiring a Resume_Action, enter the Ready_State and display the Capture_Overlay, and SHALL not request Pointer_Lock.
18. WHEN the World_Module is in the Ready_State after an `inputEnabled` change from false to true, THE World_Module SHALL request Pointer_Lock only after a Valid_User_Gesture, and SHALL enable keyboard movement and Interaction_Prompts according to criteria 1 and 2 of this requirement and Requirement 3 and Requirement 8 once the canvas holds keyboard focus.
19. WHERE `inputEnabled` is not supplied, THE World_Module SHALL treat `inputEnabled` as true and SHALL apply the current-props-only behavior of criteria 1 to 15 unchanged, including a user-initiated Resume_Action that is always available and no timer-based automatic resume.
20. WHERE `inputEnabled` is supplied, WHEN the World_Module calls `onInspect` and the prop remains true (for example because the App_Shell rejected a locked arcade request), THE World_Module SHALL release Pointer_Lock, clear all pressed keys, discard pending mouse deltas, display the Capture_Overlay, remain in the Ready_State and remain usable without any Resume_Action.
21. WHERE `inputEnabled` is supplied, THE World_Module SHALL not enter the Inspecting_State because of an `onInspect` call and SHALL leave the control of the Inspecting_State to the prop, so that the World_Module cannot remain suspended after the prop is true.
22. WHERE `inputEnabled` is supplied and is false, THE World_Module SHALL ignore a click, Enter or E as a Resume_Action until the prop changes to true.
23. THE World_Module SHALL not request Pointer_Lock without a Valid_User_Gesture in any of the cases in this requirement, including mount, prop changes, focus changes, visibility changes and `memoryShifted` changes.
24. THE World_Module SHALL leave the decision whether a station panel is open and whether the arcade is unlocked to the App_Shell, and SHALL derive no other state from `inputEnabled`.
25. THE World_Module SHALL behave correctly both when the `inputEnabled` prop is supplied and when the prop is absent.

### Requirement 12: Blender/GLB Asset Integration

**User Story:** As a developer, I want to optionally replace primitives with authored GLB models, so that the world looks polished while remaining playable if assets are missing.

#### Acceptance Criteria

1. THE World_Module SHALL render a complete playable environment using only Primitive_Fallback geometry, with no GLB asset required.
2. WHERE a GLB asset exists for an object, THE Asset_Loader SHALL load the model from `public/models/` and render the model in place of the Primitive_Fallback for that object.
3. IF a GLB asset fails to load or is absent, THEN THE Asset_Loader SHALL render the Primitive_Fallback for that object and SHALL log a single English warning identifying the asset path.
4. WHILE a GLB asset is loading, THE WorldScene SHALL render the Primitive_Fallback and SHALL not block Movement_Input.
5. THE World_Module SHALL derive Colliders and Station positions from the layout data, independent of whether GLB models or Primitive_Fallback geometry are displayed.
6. THE World_Module SHALL use only GLB assets that are original works of the team or that carry a license permitting use in the project.
7. WHEN a GLB asset is added to the repository, THE team SHALL record its source, author, license and modification status in `docs/THIRD_PARTY_ASSETS.md` (proposed change requiring approval).
8. WHERE Blender Python (bpy) scripts are provided for generating or exporting assets, THE scripts SHALL be original works of the team, SHALL reside in `tools/blender/` (approved proposal P10) and SHALL be documented with English comments and usage instructions.
9. THE World_Module SHALL create actual Blender models and GLB assets only in Milestone 5, and Milestone 1 SHALL work without Blender and without external GLB assets.
9. THE World_Module SHALL keep the total size of GLB assets loaded at startup at or below 5 MB (initial target, validated in testing).
10. THE World_Module SHALL use each GLB asset with at most 5,000 triangles for props and at most 20,000 triangles for the whole environment (initial targets, validated in testing).

### Requirement 13: Pure Logic Testability

**User Story:** As a developer, I want movement, collision and targeting as deterministic pure functions, so that they can be verified with unit and property-based tests.

#### Acceptance Criteria

1. THE World_Module SHALL expose Pure_Logic for movement stepping, look-angle updates, collision resolution and Interaction_Target selection from modules that import no React, three.js, DOM or WebGL APIs.
2. THE World_Module SHALL provide vitest unit tests for each Pure_Logic function covering at least one typical case and one boundary case.
3. THE World_Module SHALL provide property-based tests asserting that, for all generated sequences of Movement_Input, yaw angles and elapsed times, the Player position stays inside the room bounds and outside every Collider.
4. THE World_Module SHALL provide property-based tests asserting that, for all generated look inputs, the resulting pitch lies within -80 degrees to +80 degrees and the yaw is finite.
5. THE World_Module SHALL provide property-based tests asserting that, for all generated Player positions and facing directions, the Interaction_Target is either none or a Station within Interaction_Range and within the Interaction_Cone.
6. THE World_Module SHALL provide property-based tests asserting that collision resolution is idempotent: resolving an already-resolved position with zero displacement returns the same position.
7. THE World_Module SHALL provide property-based tests asserting that, for all generated pairs of equal-length input sequences, the diagonal speed does not exceed the single-axis speed.
8. THE World_Module SHALL provide a unit test asserting that every Station in the layout is reachable from the start position through the Walkable_Area.
9. THE World_Module SHALL provide a component-level test asserting that E with an Interaction_Target calls `onInspect` with the correct StationId, and that E without a target does not.
10. WHEN the command `npm test` runs, THE test suite for the World_Module SHALL execute without requiring a GPU or browser.
11. THE World_Module SHALL use a seeded or deterministic random source for any test that depends on random generation, so that a failure can be reproduced.
12. WHERE a property-based test is written, THE World_Module SHALL use `fast-check` (approved proposal P9) and SHALL configure a fixed seed that is printed on failure.
13. WHERE a component-level test needs a DOM, THE World_Module SHALL use `jsdom` and `@testing-library/react` (approved proposal P9) with the jsdom environment selected per test file through a docblock, so that Pure_Logic tests keep the default environment.
14. IF `fast-check`, `jsdom` or `@testing-library/react` cannot be installed or is incompatible with React 19, TypeScript 5.9 or Vitest 3, THEN THE World_Module SHALL fall back to a small seeded random generator for property tests and to reducer-level tests for the component behavior, and SHALL record the gap in the test report.

### Requirement 14: Performance on Integrated Graphics

**User Story:** As a player on an ordinary laptop, I want the scene to run smoothly, so that exploration is comfortable.

#### Acceptance Criteria

1. THE WorldScene SHALL cap the renderer device pixel ratio at an initial value of 1.5, validated in testing.
2. THE WorldScene SHALL use at most 4 dynamic lights simultaneously (initial limit, validated in testing).
3. THE WorldScene SHALL disable real-time shadow maps by default.
4. THE WorldScene SHALL use low-poly geometry with a total of at most 20,000 triangles in the rendered scene (initial target, validated in testing).
5. THE WorldScene SHALL use no post-processing passes, or at most one lightweight pass that can be disabled.
6. THE WorldScene SHALL reuse geometries and materials across repeated objects rather than allocating duplicates.
7. WHEN WorldScene unmounts, THE World_Module SHALL dispose of geometries, materials and textures that the World_Module created.
8. THE WorldScene SHALL maintain a median Frame_Time of at most 20 ms (at least 50 frames per second) on Reference_Hardware (initial target, validated in testing).
9. THE WorldScene SHALL maintain a 95th-percentile Frame_Time of at most 33 ms on Reference_Hardware (initial target, validated in testing).
10. THE WorldScene SHALL complete first render within 3 seconds of mount on Reference_Hardware, excluding optional GLB downloads (initial target, validated in testing).
11. WHEN any performance target in this requirement is reported as achieved in the README, submission text or demo, THE team SHALL have recorded the measurement method, hardware description and results in the repository.
12. IF the measured results have not been recorded, THEN THE team SHALL describe the performance targets as planned and not as achieved.

### Requirement 15: Accessibility and Honest Reporting

**User Story:** As a player with different abilities, I want the world to be operable and readable with a keyboard, so that I can complete the experience.

#### Acceptance Criteria

1. THE World_Module SHALL make every world action (move, look, interact, release the mouse) operable by keyboard alone.
2. THE WorldScene SHALL display an on-screen controls hint listing W A S D, the arrow keys, the keyboard look keys I J K L, E and Esc.
3. THE WorldScene SHALL use English for all visible text, accessible labels, code comments and documentation.
4. THE WorldScene SHALL render all HTML overlays with a visible focus indicator on interactive elements.
5. THE WorldScene SHALL not rely on color alone to indicate which Station is targeted; the Interaction_Prompt text SHALL name the Station.
6. WHEN a feature in this specification has not been verified by a test or a recorded manual check, THE project documentation SHALL describe the feature as planned or prototype and not as working.
7. THE World_Module SHALL include a manual test checklist for keyboard-only play, reduced-motion behavior and pointer-lock fallback, and SHALL record its outcomes before the final release.

### Requirement 16: Integration Contracts

**User Story:** As a teammate working on the arcade and VHS modules, I want the world's interface to remain stable, so that the three modules integrate without conflicts.

#### Acceptance Criteria

1. THE World_Module SHALL export a component named `WorldScene` from `src/world/WorldScene.tsx`.
2. THE WorldScene SHALL accept the props `onInspect: (station: StationId) => void` and `memoryShifted: boolean` with unchanged names and types.
3. THE World_Module SHALL import StationId and any other shared types only from `src/core/contracts.ts`.
4. WHEN the Player activates the `vhs` Station, THE World_Module SHALL call `onInspect('vhs')` to request the VHS interface.
5. WHEN the Player activates the `arcade` Station, THE World_Module SHALL call `onInspect('arcade')` to request the arcade interface.
6. THE World_Module SHALL call `onInspect` for the `arcade` Station regardless of whether the VHS clue has been found, and SHALL leave the unlock decision and the locked message to the App_Shell.
7. THE World_Module SHALL receive no GameState and SHALL not read or infer unlock status.
8. THE World_Module SHALL not import from `src/arcade/` or `src/memories/`.
9. THE World_Module SHALL not read from or write to LocalStorage, SessionStorage, IndexedDB or cookies.
10. THE World_Module SHALL not dispatch GameEvent values or call the game reducer.
11. THE WorldScene SHALL work with the current WorldSceneProps alone, with the proposed optional props treated as enhancements.
12. THE WorldScene SHALL accept the optional prop `inputEnabled?: boolean` (proposal P1, approved as an integration proposal only) as an additive prop with a default of true, so that existing call sites remain valid and backward compatible. WHERE the proposed optional prop `reducedDistortion?: boolean` (P2, pending) is approved by the team, THE WorldScene SHALL accept it as an additive optional prop with a default of false.
13. THE WorldScene SHALL not accept any prop that carries lock state, unlock state or progress data (see Requirement 20).
14. THE World_Module SHALL not modify `src/core/contracts.ts`, and any need for a new StationId or event SHALL be raised as a cross-team proposal.

### Requirement 17: File Boundaries and Proposed Cross-Module Changes

**User Story:** As Developer 1, I want clear file ownership, so that my work does not conflict with the other developers' work.

#### Acceptance Criteria

1. THE World_Module SHALL place its implementation, Pure_Logic, layout data and tests in `src/world/`.
2. THE World_Module SHALL keep all World_Module specification documents in `.kiro/specs/world-exploration/`.
3. THE World_Module SHALL not modify files in `src/arcade/`, `src/memories/` or `src/core/`.
4. THE World_Module SHALL not modify any other spec under `.kiro/specs/`.
5. THE World_Module SHALL treat each change in the following list as a proposal with the stated status, and SHALL work without a change whose status is pending or whose coordination is incomplete:
   - P1 (APPROVED as an integration proposal only; implementation in `src/App.tsx` requires team coordination and is not done): Add the optional prop `inputEnabled?: boolean` (default true) to WorldSceneProps and have `src/App.tsx` pass `inputEnabled={station === null}`, so that the world suspends input while a panel is open and returns to the Ready_State after the panel closes. The proposal is additive and backward compatible. The detailed behavior is in Requirement 11 criteria 16 to 25. Until `src/App.tsx` passes the prop, the World_Module uses the current-props-only behavior in Requirement 11 criteria 3 to 15 with user-initiated resume.
   - P2: Add optional `reducedDistortion?: boolean` prop to WorldSceneProps, wired by `src/App.tsx` to the shared reduced-distortion setting. Fallback: `prefers-reduced-motion` only.
   - P3: Add CSS rules for the Capture_Overlay, Interaction_Prompt and controls hint to `src/styles.css`. Fallback: inline styles or a CSS file imported from `src/world/`.
   - P4: Update `src/App.tsx` status text that says "Click the CRT television to inspect a prototype tape" and the scene card hint to describe the new controls.
   - P5: Add the `@react-three/drei` dependency (for example for GLB loading helpers). Fallback: use `three/examples/jsm/loaders/GLTFLoader` that ships with the `three` package.
   - P6: Add entries for each external asset to `docs/THIRD_PARTY_ASSETS.md`.
   - P7: Mark Developer 1 tasks complete in `.kiro/specs/game-foundation/tasks.md` only after verification.
   - P9 (APPROVED): Add the development dependencies `fast-check`, `jsdom` and `@testing-library/react`, plus required peer and type packages such as `@testing-library/dom`, to `package.json`. The dependencies SHALL be added only when the corresponding testing tasks are implemented, SHALL be compatible with React 19, TypeScript 5.9 and Vitest 3, and SHALL use the jsdom environment per test file through a docblock instead of a global Vitest configuration change. IF a global Vitest configuration change is unavoidable, THEN the change SHALL be flagged for review. Fallback only if installation or compatibility fails: a seeded random generator and reducer-level tests (Requirement 13 criterion 14).
   - P10 (APPROVED): Allow `tools/blender/` for original Python bpy asset-generation scripts. The scripts and the Blender models belong to Milestone 5. Milestone 1 SHALL work without Blender and without external GLB assets.
   - P8 (optional, App-side only, pending approval by the owner of `src/App.tsx`): Render the App_Shell locked-arcade message more prominently, for example through styling of the Status_Line. The proposal needs no World_Module change and no new WorldSceneProps. No prop for lock state is proposed, because the prop would duplicate the unlock rule that the App_Shell owns.
6. IF a proposal is not approved, THEN THE World_Module SHALL implement the stated fallback.
7. THE World_Module SHALL not require any modification of `src/App.tsx` for correct behavior, and `src/App.tsx` SHALL remain unmodified by the World_Module work until the team has coordinated the change for the relevant proposal. The approval of P1 as an integration proposal does not authorize a change to `src/App.tsx`.
8. THE proposals P1 and P2 SHALL remain separate proposals, so that approval of one does not imply approval of the other. P2 to P8 remain pending.
9. THE World_Module SHALL keep `src/core/`, `src/arcade/` and `src/memories/` unchanged, and SHALL preserve the WorldSceneProps contract and the StationId contract.
10. THE World_Module SHALL add no dependency other than those approved in P9 and, where the fallback applies, SHALL not add drei, post-processing packages or shader libraries.

### Requirement 18: Out of Scope

**User Story:** As a team member, I want clear boundaries of what the world does not cover, so that scope stays manageable.

#### Acceptance Criteria

1. THE World_Module SHALL not implement Snake gameplay, rendering or scoring.
2. THE World_Module SHALL not implement VHS playback, tape collection, clue identification or story text.
3. THE World_Module SHALL not implement persistent story progression, save data or reset logic.
4. THE World_Module SHALL not implement multiplayer, networking or a backend.
5. THE World_Module SHALL not implement enemies, combat, health or fail states.
6. THE World_Module SHALL not implement audio playback beyond optional ambient hooks that the narrative/UI role approves.
7. THE World_Module SHALL not implement mobile touch controls in the MVP.
8. THE World_Module SHALL not implement the main menu, ending screen or reduced-distortion settings UI, which belong to the narrative/UI role.

### Requirement 19: Milestone 1 Minimum Shippable Slice

**User Story:** As Developer 1, I want a small first milestone that is playable on its own, so that the team has a working 3D room early and can add detail incrementally.

#### Acceptance Criteria

1. THE WorldScene SHALL render, in Milestone 1, a single enclosed room with a floor, a ceiling and four walls, built only from primitive low-poly three.js geometry.
2. THE WorldScene SHALL render, in Milestone 1, a reception desk, a CRT television with a VHS player as the `vhs` Station, an arcade cabinet as the `arcade` Station, and at least 2 shelves inside the single room.
3. THE World_Module SHALL load no GLB asset and apply no post-processing pass in Milestone 1.
4. THE World_Module SHALL provide, in Milestone 1, first-person walking with W, A, S and D and mouse look through Pointer_Lock, as defined in Requirement 3 criteria 1 to 3, 5, 6, 7, 10 and 11 and Requirement 4 criteria 1 to 4 and 6 to 9.
5. THE World_Module SHALL provide, in Milestone 1, collision with the walls, the reception desk, the shelves and the Stations, as defined in Requirement 6 criteria 1, 2, 3, 8 and 9.
6. THE World_Module SHALL provide, in Milestone 1, Station interaction with the E key, the Interaction_Prompt and the call to `onInspect`, as defined in Requirement 7 criteria 1, 2, 4 to 8 and Requirement 8 criteria 1, 2 and 6.
7. THE World_Module SHALL provide, in Milestone 1, the Inspecting_State and the input handling in Requirement 11 criteria 1 to 15, so that the first playable room does not move the Player while a panel is open.
8. WHEN `memoryShifted` is true, THE WorldScene SHALL change at least the background color and the ambient light color in Milestone 1, and SHALL apply no other Memory_Shift transformation or transition until Milestone 4.
9. THE WorldScene SHALL defer the Arcade_Area as a separate area, doors, the additional detail objects, Environmental_Effects, the keyboard look alternative, the pointer-lock fallback, GLB integration and the full Memory_Shift to the milestones listed in the milestone traceability table.
10. WHEN a later milestone is implemented, THE World_Module SHALL preserve the WorldSceneProps contract and the Milestone 1 behavior defined in this requirement.
11. THE World_Module SHALL confine all Milestone 1 changes to `src/world/` and SHALL not change `src/arcade/`, `src/memories/` or `src/core/`, and, apart from test dependencies added under P9 when the testing tasks are implemented, SHALL leave `package.json` unchanged.
12. THE World_Module SHALL keep Milestone 1 to one small, playable, low-poly room, with no advanced shaders, no post-processing and no Blender or GLB dependency.

### Requirement 20: Locked Arcade Feedback Ownership

**User Story:** As a player, I want to be told why the arcade does not open yet, so that I know what to do next, without the world duplicating the game's unlock rules.

#### Acceptance Criteria

1. THE World_Module SHALL not read GameState, discovered clues, collected tapes or any other clue or unlock data, and SHALL have no knowledge of whether the arcade is locked.
2. THE App_Shell SHALL remain the single source of truth for unlock rules and for the lock message 'ARCADE LOCKED · Recover the VHS clue first.'.
3. THE WorldScene SHALL display, for the `arcade` Station, the fixed Interaction_Prompt text "Press E to use the arcade cabinet" regardless of game progress.
4. WHEN the Player activates the `arcade` Station, THE World_Module SHALL call `onInspect('arcade')`.
5. THE World_Module SHALL not block, hide or alter the `arcade` interaction based on game progress.
6. THE WorldScene SHALL render the idle attract-screen appearance of the arcade cabinet identically regardless of whether the arcade is locked.
7. THE canvas accessible description and the controls hint SHALL tell the player that messages about station interactions, including why a station cannot be used yet, appear in the Status_Line below the scene.
8. THE WorldScene SHALL keep all world overlays inside the World_Wrapper so that the Status_Line remains visible and is not covered, suppressed or replaced by any world overlay.
9. THE WorldScene SHALL propose no new prop for lock state, because such a prop would duplicate the unlock rule that the App_Shell owns.
