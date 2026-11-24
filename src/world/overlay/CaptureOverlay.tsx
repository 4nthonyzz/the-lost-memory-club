export const CAPTURE_TEXT = 'Click to look around · Esc releases the mouse';

export function CaptureOverlay() {
  return (
    <div className="world-capture">
      <span className="world-chip">{CAPTURE_TEXT}</span>
    </div>
  );
}
