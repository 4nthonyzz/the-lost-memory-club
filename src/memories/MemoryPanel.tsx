import { FIRST_CLUE_ID, FIRST_TAPE_ID } from '../core/contracts';

interface MemoryPanelProps {
  hasTape: boolean;
  hasClue: boolean;
  onCollect: (tapeId: string) => void;
  onDiscoverClue: (tapeId: string, clueId: string) => void;
  onClose: () => void;
}

export function MemoryPanel({ hasTape, hasClue, onCollect, onDiscoverClue, onClose }: MemoryPanelProps) {
  return (
    <section className="station-panel" aria-label="VHS module prototype">
      <p className="eyebrow">ARCHIVE / MODULE 03</p>
      <h2>RECORDING 09</h2>
      <p>A faded tape waits beside the television. This panel currently demonstrates only the clue/event contract.</p>
      <div className="terminal-placeholder" role="note">PLAY / PAUSE / REWIND — TO BE IMPLEMENTED</div>
      <div className="panel-buttons">
        {!hasTape && <button type="button" onClick={() => onCollect(FIRST_TAPE_ID)}>Collect prototype tape</button>}
        {hasTape && !hasClue && <button type="button" onClick={() => onDiscoverClue(FIRST_TAPE_ID, FIRST_CLUE_ID)}>Inspect label clue</button>}
        {hasClue && <p className="success-note">CLUE RECORDED · Arcade unlocked</p>}
        <button type="button" className="secondary" onClick={onClose}>Close</button>
      </div>
      <p className="fineprint">Actual VHS playback, narrative clues and rewind mechanics are pending Developer 3.</p>
    </section>
  );
}
