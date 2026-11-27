export interface AudioBadgeProps {
  muted: boolean;
  onToggle: () => void;
}

/**
 * "AUDIO: ON [M]" / "AUDIO: MUTED [M]" toggle in the bottom-right corner, stacked above the notes counter.
 * The button keeps the world focused when pressed with the mouse so the keyboard controls keep working.
 */
export function AudioBadge({ muted, onToggle }: AudioBadgeProps) {
  return (
    <div className="world-audio" role="status">
      <button
        type="button"
        className="world-button world-audio-button"
        aria-pressed={muted}
        aria-label="Toggle audio (M)"
        title={'Late-night synth & room SFX \u2014 press M to mute'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
      >
        {muted ? 'AUDIO: MUTED [M]' : 'AUDIO: ON [M]'}
      </button>
    </div>
  );
}
