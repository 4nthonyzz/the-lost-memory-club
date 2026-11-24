import { useEffect, useReducer, useRef, useState } from 'react';
import { ArcadePanel } from './arcade/ArcadePanel';
import { FIRST_CLUE_ID, FIRST_TAPE_ID, SAVE_KEY, SNAKE_GAME_ID, type GameEvent, type StationId } from './core/contracts';
import { gameReducer, loadGameState, saveGameState } from './core/gameReducer';
import { MemoryPanel } from './memories/MemoryPanel';
import { WorldScene } from './world/WorldScene';

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGameState);
  const [station, setStation] = useState<StationId | null>(null);
  const [message, setMessage] = useState('Click the CRT television to inspect a prototype tape.');
  const hasClue = state.discoveredClues.includes(FIRST_CLUE_ID);
  const memoryShifted = state.completedArcades.includes(SNAKE_GAME_ID);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const shellRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);
  const stationOpen = station !== null;

  useEffect(() => saveGameState(state), [state]);

  // Escape closes the open station overlay. The listener exists only while a station is open.
  useEffect(() => {
    if (!stationOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setStation(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stationOpen]);

  // Move focus into the dialog on open; return it to the world wrapper on close.
  // Pointer lock is never requested here.
  useEffect(() => {
    if (stationOpen) {
      const first = dialogRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (first ?? dialogRef.current)?.focus();
    } else if (wasOpen.current) {
      shellRef.current?.querySelector<HTMLElement>('.world-wrapper')?.focus();
    }
    wasOpen.current = stationOpen;
  }, [stationOpen, station]);

  function interact(nextStation: StationId) {
    if (nextStation === 'arcade' && !hasClue) {
      setMessage('ARCADE LOCKED · Recover the VHS clue first.');
      return;
    }
    setStation(nextStation);
    setMessage(nextStation === 'vhs' ? 'CRT STATION CONNECTED' : 'ARCADE STATION CONNECTED');
  }

  function send(event: GameEvent) {
    dispatch(event);
    if (event.type === 'ARCADE_STARTED') setMessage('Arcade initialization event logged. Gameplay is pending.');
    if (event.type === 'VHS_CLUE_FOUND') setMessage('CLUE CONFIRMED · The arcade is now unlocked.');
  }

  function reset() {
    try { window.localStorage.removeItem(SAVE_KEY); } catch { /* Optional storage. */ }
    dispatch({ type: 'RESET_DEMO' });
    setStation(null);
    setMessage('Development save reset.');
  }

  const dialogTitle = station === 'vhs' ? 'VHS station' : 'Arcade station';
  const progress: Array<[string, boolean]> = [
    ['TAPE', state.collectedTapes.includes(FIRST_TAPE_ID)],
    ['CLUE', hasClue],
    ['ARCADE', memoryShifted],
    ['ENDING', state.endingUnlocked],
  ];

  return (
    <main className="game-shell" ref={shellRef}>
      <WorldScene inputEnabled={station === null} onInspect={interact} memoryShifted={memoryShifted} />
      <div className="hud-progress" aria-label="Prototype progress">
        <span className="hud-tag">PROTOTYPE</span>
        <ul>
          {progress.map(([label, done]) => (
            <li key={label} className={done ? 'done' : undefined}>{label} {done ? '✓' : '·'}<span className="sr-only">{done ? ' done' : ' pending'}</span></li>
          ))}
        </ul>
      </div>
      <div className="hud-status" role="status">{message}</div>
      <div className="hud-drawer">
        <button type="button" className="secondary" aria-expanded={drawerOpen} aria-controls="hud-drawer-body" onClick={() => setDrawerOpen((open) => !open)}>
          {drawerOpen ? 'Close menu' : 'Menu'}
        </button>
        <div id="hud-drawer-body" className="hud-drawer-body" hidden={!drawerOpen}>
          <p>Move: W A S D or arrows. Look: mouse or I J K L. Interact: E. Esc releases the mouse or closes a station.</p>
          <button type="button" className="secondary" onClick={reset}>Reset local prototype state</button>
        </div>
      </div>
      {station && (
        <div className="modal-backdrop">
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-label={dialogTitle} ref={dialogRef} tabIndex={-1}>
            {station === 'vhs' && <MemoryPanel hasTape={state.collectedTapes.includes(FIRST_TAPE_ID)} hasClue={hasClue} onCollect={(tapeId) => send({ type: 'TAPE_COLLECTED', tapeId })} onDiscoverClue={(tapeId, clueId) => send({ type: 'VHS_CLUE_FOUND', tapeId, clueId })} onClose={() => setStation(null)} />}
            {station === 'arcade' && <ArcadePanel onStart={(gameId) => send({ type: 'ARCADE_STARTED', gameId })} onClose={() => setStation(null)} />}
          </div>
        </div>
      )}
    </main>
  );
}
