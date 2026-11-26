import { useState } from 'react';

export const CONTROLS_LINES: readonly string[] = [
  'W A S D: move',
  'Arrow keys: move',
  'Mouse: look (after clicking the view)',
  'I J K L: look with the keyboard',
  'E: interact with a station',
  'Esc: release the mouse',
  'M: toggle audio',
];

export const STATUS_NOTE = 'Station messages, including why a station cannot be used yet, appear in the status line at the bottom of the screen.';

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
