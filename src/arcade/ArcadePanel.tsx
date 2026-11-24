import { SNAKE_GAME_ID } from '../core/contracts';

interface ArcadePanelProps {
  onStart: (gameId: string) => void;
  onClose: () => void;
}

export function ArcadePanel({ onStart, onClose }: ArcadePanelProps) {
  return (
    <section className="station-panel" aria-label="Arcade module prototype">
      <p className="eyebrow">ARCADE / MODULE 02</p>
      <h2>THE HUNGRY TAPE</h2>
      <p>The arcade station is unlocked. The actual Snake Canvas game is the next task for Developer 2.</p>
      <div className="terminal-placeholder" role="note">GAME ENGINE NOT IMPLEMENTED YET</div>
      <div className="panel-buttons">
        <button type="button" onClick={() => onStart(SNAKE_GAME_ID)}>Initialize arcade session</button>
        <button type="button" className="secondary" onClick={onClose}>Close</button>
      </div>
      <p className="fineprint">This initialization event does not award a win or unlock the ending.</p>
    </section>
  );
}
