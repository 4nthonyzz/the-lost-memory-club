import { useEffect, useReducer, useState } from 'react';
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

  useEffect(() => saveGameState(state), [state]);

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

  return (
    <main className="app-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">ARCHIVE 09 / EST. 1996</p>
          <h1>THE LOST MEMORY CLUB</h1>
          <p className="subheading">Some memories should stay forgotten.</p>
        </div>
        <span className="build-pill">DEVELOPMENT SCAFFOLD · NOT THE FINAL GAME</span>
      </header>
      <div className="content-grid">
        <section className="scene-card">
          <div className="section-heading"><span>ARCHIVE FLOOR · PROTOTYPE</span><span className="online-dot">● RENDER ONLINE</span></div>
          <WorldScene onInspect={interact} memoryShifted={memoryShifted} />
          <div className="scene-status" role="status">{message}</div>
        </section>
        <aside className="side-column">
          <div className="info-card">
            <p className="eyebrow">FIELD NOTES</p>
            <h2>Prototype Progress</h2>
            <div className="metric"><span>VHS collected</span><strong>{state.collectedTapes.includes(FIRST_TAPE_ID) ? 'YES' : 'NO'}</strong></div>
            <div className="metric"><span>Clue discovered</span><strong>{hasClue ? 'YES' : 'NO'}</strong></div>
            <div className="metric"><span>Arcade completed</span><strong>{memoryShifted ? 'YES' : 'NO'}</strong></div>
            <div className="metric"><span>Ending unlocked</span><strong>{state.endingUnlocked ? 'YES' : 'NO'}</strong></div>
            <button type="button" className="secondary reset" onClick={reset}>Reset local prototype state</button>
          </div>
          {station === 'vhs' && <MemoryPanel hasTape={state.collectedTapes.includes(FIRST_TAPE_ID)} hasClue={hasClue} onCollect={(tapeId) => send({ type: 'TAPE_COLLECTED', tapeId })} onDiscoverClue={(tapeId, clueId) => send({ type: 'VHS_CLUE_FOUND', tapeId, clueId })} onClose={() => setStation(null)} />}
          {station === 'arcade' && <ArcadePanel onStart={(gameId) => send({ type: 'ARCADE_STARTED', gameId })} onClose={() => setStation(null)} />}
          {!station && <div className="info-card instructions"><p className="eyebrow">WHAT COMES NEXT?</p><p>This starter proves the 3D scene and three-module integration. Developers must implement movement, real VHS media and the Snake game before submission.</p></div>}
        </aside>
      </div>
      <footer>KIROWEEN 2026 · ORIGINAL PROTOTYPE · NO THIRD-PARTY ASSETS INCLUDED</footer>
    </main>
  );
}
