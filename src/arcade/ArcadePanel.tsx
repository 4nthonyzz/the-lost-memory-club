import { useState } from 'react';
import { SNAKE_GAME_ID } from '../core/contracts';

interface ArcadePanelProps {
  onStart: (gameId: string) => void;
  onWin?: (gameId: string, score: number) => void;
  onClose: () => void;
}

export function ArcadePanel({ onStart, onWin, onClose }: ArcadePanelProps) {
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  function start() {
    setStarted(true);
    onStart(SNAKE_GAME_ID);
  }

  function complete() {
    setCompleted(true);
    onWin?.(SNAKE_GAME_ID, 1200);
  }

  return (
    <section className="station-panel" aria-label="Arcade module">
      <p className="eyebrow">ARCADE / MODULE 02</p>
      <h2>THE HUNGRY TAPE</h2>
      <p>Snake.EXE is waiting inside the cabinet. Follow the tape signal and catch the moving memory before it disappears.</p>
      <div className="arcade-challenge" role="note">
        <div className="arcade-challenge__screen" aria-hidden="true">
          <span className="arcade-challenge__memory">●</span>
          <span className="arcade-challenge__snake">▰▰▰</span>
        </div>
        {!started && <p>Press start to connect the cabinet.</p>}
        {started && !completed && <p>Signal connected. The memory is exposed.</p>}
        {completed && <p className="success-note">SNAKE.EXE COMPLETE · Archive 09 unlocked.</p>}
      </div>
      <div className="panel-buttons">
        {!started && <button type="button" onClick={start}>Initialize arcade session</button>}
        {started && !completed && <button type="button" onClick={complete}>Catch the memory</button>}
        {completed && <button type="button" className="secondary" onClick={onClose}>Continue to Archive 09</button>}
        <button type="button" className="secondary" onClick={onClose}>Close</button>
      </div>
      <p className="fineprint">Keyboard Snake integration can replace this compact playable slice without changing the event boundary.</p>
    </section>
  );
}
