import { useState } from 'react';

export const CONTROLS_LINES: readonly string[] = [
  'W A S D: move',
  'Arrow keys: move',
  'Mouse: look (after clicking the view)',
  'I J K L: look with the keyboard',
  'E: interact with a station',
  'Esc: release the mouse',
];

export const STATUS_NOTE = 'Status messages appear in the status line below the scene.';

export function ControlsHint() {
  const [open, setOpen] = useState(true);
  return (
    <div className="world-controls">
      <button
        type="button"
        className="world-button world-controls-toggle"
        aria-expanded={open}
        aria-controls="world-controls-body"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide controls' : 'Show controls'}
      </button>
      <div id="world-controls-body" className="world-chip world-controls-body" hidden={!open}>
        <ul>
          {CONTROLS_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p>{STATUS_NOTE}</p>
      </div>
    </div>
  );
}
