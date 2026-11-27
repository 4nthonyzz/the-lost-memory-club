export const KEYBOARD_LOOK_HINT_TEXT =
  'Mouse capture is unavailable. Use I J K L to look around and W A S D or the arrow keys to move.';

/** Static note shown after pointer lock is denied or unsupported. */
export function KeyboardLookHint() {
  return (
    <div className="world-chip world-keyboard-look" role="note">
      {KEYBOARD_LOOK_HINT_TEXT}
    </div>
  );
}
