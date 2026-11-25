import { useEffect, useReducer, useRef, useState } from 'react';
import { ArcadePanel } from './arcade/ArcadePanel';
import { MEMORY_ID, SAVE_KEY, SNAKE_GAME_ID, type StationId } from './core/contracts';
import { gameReducer, loadGameState, saveGameState } from './core/gameReducer';
import { buildJournalModel } from './memories/fragments/journalView';
import { ACTS, ARCHIVE_TAPE } from './memories/fragments/memoryCatalog';
import { tapeTitle } from './memories/fragments/narrativeText';
import {
  canLoadSummerTape,
  canOpenArchive,
  clueEventFor,
  DEMO_ARCADE_SCORE,
  EMPTY_SESSION,
  isArchiveRestored,
  isClueFound,
  isPerfectTrackingDetection,
  progressFor,
  recordPerfectTracking,
  SUMMER_TAPE,
  toggleMinigameSecret,
  type SessionProgress,
} from './memories/session';
import type { ClueDetection, TapeDefinition } from './memories/restoration/types';
import { VhsPlayer } from './memories/VhsPlayer';
import { AccessibilitySettings } from './ui/AccessibilitySettings';
import { CrtCorruptionOverlay } from './ui/CrtCorruptionOverlay';
import { EndingScreen } from './ui/EndingScreen';
import { MemoryJournal } from './ui/MemoryJournal';
import { SaveIndicator } from './ui/SaveIndicator';
import { resolveSaveStatus } from './ui/saveStatus';
import { getUiStrings, type SaveStatus, type ShellNotice } from './ui/strings';
import { usePreferences } from './ui/usePreferences';
import { WorldScene } from './world/WorldScene';

type Panel = StationId | 'ending' | null;

interface DemoControlsProps {
  clueFound: boolean;
  arcadeDone: boolean;
  session: SessionProgress;
  onWinArcade: () => void;
  onToggleSecret: (secretId: string) => void;
  onResetSession: () => void;
}

function DemoControls({ clueFound, arcadeDone, session, onWinArcade, onToggleSecret, onResetSession }: DemoControlsProps) {
  return (
    <section className="info-card dev-panel" aria-label="Dev and demo controls">
      <p className="eyebrow">DEV / DEMO CONTROLS</p>
      <p className="fineprint">Shown only in development builds. Session flags are not saved.</p>
      <button type="button" className="secondary" disabled={!clueFound || arcadeDone} onClick={onWinArcade}>
        Simulate arcade win
      </button>
      <fieldset className="dev-panel__secrets">
        <legend>Minigame secrets</legend>
        {ACTS.map((act) => (
          <label key={act.secret.id} className="dev-panel__check">
            <input type="checkbox" checked={session.minigameSecrets.includes(act.secret.id)} onChange={() => onToggleSecret(act.secret.id)} />
            <span>{`${act.gameName}: ${act.secret.label}`}</span>
          </label>
        ))}
      </fieldset>
      <p className="fineprint">
        Perfect archive signal: {session.perfectTrackingArchive ? 'YES' : 'NO'}. Load Archive 09, pause between 50 s and 55 s and set tracking to 100%.
      </p>
      <button type="button" className="secondary" onClick={onResetSession}>
        Reset session flags
      </button>
    </section>
  );
}

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGameState);
  const [preferences, updatePreferences] = usePreferences();
  const [session, setSession] = useState<SessionProgress>(EMPTY_SESSION);
  const [station, setStation] = useState<Panel>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deckTape, setDeckTape] = useState<TapeDefinition | null>(null);
  const [notice, setNotice] = useState<ShellNotice>('intro');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const shellRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);

  const { language, reducedDistortion, muted } = preferences;
  const shell = getUiStrings(language).shell;
  const stationOpen = station !== null;
  const clueFound = isClueFound(state);
  const arcadeDone = canOpenArchive(state);
  const archiveRestored = isArchiveRestored(state);
  const journal = buildJournalModel(state, progressFor(session), language);
  const progress: Array<[string, boolean]> = [
    ['TAPE', state.collectedTapes.includes(SUMMER_TAPE.id)],
    ['CLUE', clueFound],
    ['ARCADE', arcadeDone],
    ['ENDING', state.endingUnlocked],
  ];

  useEffect(() => {
    setSaveStatus('saving');
    saveGameState(state);
    setSaveStatus(resolveSaveStatus(JSON.stringify(state), () => window.localStorage.getItem(SAVE_KEY)));
  }, [state]);

  useEffect(() => {
    if (!stationOpen) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closePanel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stationOpen]);

  useEffect(() => {
    if (stationOpen) {
      const first = dialogRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (first ?? dialogRef.current)?.focus();
    } else if (wasOpen.current) {
      shellRef.current?.querySelector<HTMLElement>('.world-wrapper')?.focus();
    }
    wasOpen.current = stationOpen;
  }, [stationOpen, station]);

  function closePanel() {
    setStation(null);
    setDeckTape(null);
  }

  function interact(nextStation: StationId) {
    if (nextStation === 'arcade' && !clueFound) {
      setNotice('arcadeLocked');
      return;
    }
    setStation(nextStation);
    setNotice(nextStation === 'vhs' ? 'crtConnected' : 'arcadeConnected');
  }

  function collectTape() {
    dispatch({ type: 'TAPE_COLLECTED', tapeId: SUMMER_TAPE.id });
    setNotice('tapeCollected');
  }

  function inspectLabelClue() {
    dispatch(clueEventFor({ tapeId: SUMMER_TAPE.id, clueId: ACTS[0]!.clueId }));
    setNotice('clueConfirmed');
  }

  function loadSummerTape() {
    setDeckTape(SUMMER_TAPE);
  }

  function loadArchive() {
    dispatch({ type: 'MEMORY_RESTORED', memoryId: MEMORY_ID });
    setDeckTape(ARCHIVE_TAPE);
    setNotice('archiveLoaded');
  }

  function handleDetection(detection: ClueDetection) {
    if (isPerfectTrackingDetection(detection)) {
      setSession(recordPerfectTracking);
      return;
    }
    dispatch(clueEventFor(detection));
  }

  function startArcade(gameId: string) {
    dispatch({ type: 'ARCADE_STARTED', gameId });
    setNotice('arcadeLogged');
  }

  function simulateArcadeWin() {
    dispatch({ type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: DEMO_ARCADE_SCORE });
    setNotice('demoArcadeWon');
  }

  function openEnding() {
    if (!archiveRestored) {
      setNotice('endingLocked');
      return;
    }
    setStation('ending');
  }

  function reset() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage may be unavailable. The reset still applies in memory.
    }
    dispatch({ type: 'RESET_DEMO' });
    setSession(EMPTY_SESSION);
    setDeckTape(null);
    setStation(null);
    setDrawerOpen(false);
    setNotice('reset');
  }

  const dialogTitle = station === 'vhs' ? shell.deck.title : station === 'arcade' ? 'Arcade station' : shell.progress.openEnding;

  return (
    <main className="game-shell" ref={shellRef}>
      <WorldScene inputEnabled={!stationOpen} onInspect={interact} memoryShifted={arcadeDone} />
      <CrtCorruptionOverlay level={journal.atmosphere.distortion} reducedDistortion={reducedDistortion} />

      <div className="hud-progress" aria-label="Prototype progress">
        <span className="hud-tag">PROTOTYPE</span>
        <ul>
          {progress.map(([label, done]) => (
            <li key={label} className={done ? 'done' : undefined}>
              {label} {done ? '\u2713' : '\u00b7'}
              <span className="sr-only">{done ? ' done' : ' pending'}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="hud-status" role="status">{shell.notices[notice]}</div>
      <div className="hud-drawer">
        <button type="button" className="secondary" aria-expanded={drawerOpen} aria-controls="hud-drawer-body" onClick={() => setDrawerOpen((open) => !open)}>
          {drawerOpen ? 'Close menu' : 'Menu'}
        </button>
        <div id="hud-drawer-body" className="hud-drawer-body" hidden={!drawerOpen}>
          <p>Move: W A S D or arrows. Look: mouse or I J K L. Interact: E. Esc releases the mouse or closes a station.</p>
          <SaveIndicator status={saveStatus} language={language} />
          <AccessibilitySettings preferences={preferences} onChange={updatePreferences} />
          <button type="button" className="secondary" onClick={openEnding}>{shell.progress.openEnding}</button>
          <button type="button" className="secondary" onClick={reset}>{shell.progress.reset}</button>
          <MemoryJournal language={language} entries={journal.entries} totalEntries={journal.totalEntries} atmosphere={journal.atmosphere} />
        </div>
      </div>

      {stationOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-label={dialogTitle} ref={dialogRef} tabIndex={-1}>
            {station === 'vhs' && (
              <section className="station-panel" aria-label={shell.deck.title}>
                <p className="eyebrow">{shell.deck.eyebrow}</p>
                <h2>{shell.deck.title}</h2>
                <ul className="tape-shelf">
                  <li className="tape-shelf__item">
                    <span className="tape-shelf__title">{tapeTitle(SUMMER_TAPE.id, language)}</span>
                    {canLoadSummerTape(state) ? (
                      <>
                        <button type="button" className="secondary" disabled={deckTape?.id === SUMMER_TAPE.id} onClick={loadSummerTape}>
                          {deckTape?.id === SUMMER_TAPE.id ? shell.deck.loaded : shell.deck.load}
                        </button>
                        {!clueFound && !deckTape && (
                          <button type="button" className="secondary" onClick={inspectLabelClue}>{shell.deck.inspect}</button>
                        )}
                      </>
                    ) : (
                      <button type="button" onClick={collectTape}>{shell.deck.collect}</button>
                    )}
                  </li>
                  <li className="tape-shelf__item">
                    <span className="tape-shelf__title">{tapeTitle(ARCHIVE_TAPE.id, language)}</span>
                    {arcadeDone ? (
                      <button type="button" className="secondary" onClick={loadArchive}>{shell.deck.archiveOpen}</button>
                    ) : (
                      <span className="tape-shelf__locked">{shell.deck.archiveLocked}</span>
                    )}
                  </li>
                </ul>
                {deckTape ? (
                  <VhsPlayer
                    key={deckTape.id}
                    tape={deckTape}
                    language={language}
                    reducedDistortion={reducedDistortion}
                    muted={muted}
                    onMutedChange={(value) => updatePreferences({ muted: value })}
                    onClueDetected={handleDetection}
                    onClose={closePanel}
                  />
                ) : (
                  <p className="fineprint">{shell.deck.emptyDeck}</p>
                )}
                <div className="panel-buttons">
                  <button type="button" className="secondary" onClick={closePanel}>{shell.deck.close}</button>
                </div>
              </section>
            )}
            {station === 'arcade' && <ArcadePanel onStart={startArcade} onClose={closePanel} />}
            {station === 'ending' && archiveRestored && (
              <EndingScreen language={language} reducedDistortion={reducedDistortion} endings={journal.endings} onRestart={closePanel} />
            )}
          </div>
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="dev-drawer">
          <DemoControls
            clueFound={clueFound}
            arcadeDone={arcadeDone}
            session={session}
            onWinArcade={simulateArcadeWin}
            onToggleSecret={(secretId) => setSession((current) => toggleMinigameSecret(current, secretId))}
            onResetSession={() => setSession(EMPTY_SESSION)}
          />
        </div>
      )}
    </main>
  );
}
