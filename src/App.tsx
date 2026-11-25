import { useEffect, useReducer, useState } from 'react';
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
  const [panel, setPanel] = useState<Panel>(null);
  const [deckTape, setDeckTape] = useState<TapeDefinition | null>(null);
  const [notice, setNotice] = useState<ShellNotice>('intro');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const { language, reducedDistortion, muted } = preferences;
  const shell = getUiStrings(language).shell;
  const clueFound = isClueFound(state);
  const arcadeDone = canOpenArchive(state);
  const archiveRestored = isArchiveRestored(state);
  const journal = buildJournalModel(state, progressFor(session), language);
  const yesNo = (value: boolean) => (value ? shell.progress.yes : shell.progress.no);

  useEffect(() => {
    setSaveStatus('saving');
    saveGameState(state);
    setSaveStatus(resolveSaveStatus(JSON.stringify(state), () => window.localStorage.getItem(SAVE_KEY)));
  }, [state]);

  function openPanel(station: StationId) {
    if (station === 'arcade' && !clueFound) {
      setNotice('arcadeLocked');
      return;
    }
    setPanel(station);
    setNotice(station === 'vhs' ? 'crtConnected' : 'arcadeConnected');
  }

  function closePanel() {
    setPanel(null);
    setDeckTape(null);
  }

  function collectTape() {
    dispatch({ type: 'TAPE_COLLECTED', tapeId: SUMMER_TAPE.id });
    setNotice('tapeCollected');
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
    setPanel('ending');
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
    setPanel(null);
    setNotice('reset');
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">{shell.eyebrow}</p>
          <h1>{shell.title}</h1>
          <p className="subheading">{shell.subheading}</p>
        </div>
        <span className="build-pill">{shell.buildPill}</span>
      </header>

      <div className="content-grid">
        <section className="scene-card">
          <div className="section-heading">
            <span>{shell.sceneHeading}</span>
            <span className="online-dot">{`\u25cf ${shell.renderOnline}`}</span>
          </div>
          <div className="scene-frame">
            <WorldScene onInspect={openPanel} memoryShifted={arcadeDone} />
            <CrtCorruptionOverlay level={journal.atmosphere.distortion} reducedDistortion={reducedDistortion} />
          </div>
          <div className="scene-status" role="status">
            {shell.notices[notice]}
          </div>
        </section>

        <aside className="side-column">
          <div className="info-card">
            <p className="eyebrow">{shell.progress.eyebrow}</p>
            <h2>{shell.progress.heading}</h2>
            <div className="metric">
              <span>{shell.progress.tape}</span>
              <strong>{yesNo(state.collectedTapes.includes(SUMMER_TAPE.id))}</strong>
            </div>
            <div className="metric">
              <span>{shell.progress.clue}</span>
              <strong>{yesNo(clueFound)}</strong>
            </div>
            <div className="metric">
              <span>{shell.progress.arcade}</span>
              <strong>{yesNo(arcadeDone)}</strong>
            </div>
            <div className="metric">
              <span>{shell.progress.ending}</span>
              <strong>{yesNo(state.endingUnlocked)}</strong>
            </div>
            <div className="save-row">
              <SaveIndicator status={saveStatus} language={language} />
            </div>
            <button type="button" className="secondary reset" onClick={openEnding}>
              {shell.progress.openEnding}
            </button>
            <button type="button" className="secondary reset" onClick={reset}>
              {shell.progress.reset}
            </button>
          </div>

          {panel === 'vhs' && (
            <section className="station-panel" aria-label={shell.deck.title}>
              <p className="eyebrow">{shell.deck.eyebrow}</p>
              <h2>{shell.deck.title}</h2>
              <ul className="tape-shelf">
                <li className="tape-shelf__item">
                  <span className="tape-shelf__title">{tapeTitle(SUMMER_TAPE.id, language)}</span>
                  {canLoadSummerTape(state) ? (
                    <button type="button" className="secondary" disabled={deckTape?.id === SUMMER_TAPE.id} onClick={loadSummerTape}>
                      {deckTape?.id === SUMMER_TAPE.id ? shell.deck.loaded : shell.deck.load}
                    </button>
                  ) : (
                    <button type="button" onClick={collectTape}>
                      {shell.deck.collect}
                    </button>
                  )}
                </li>
                <li className="tape-shelf__item">
                  <span className="tape-shelf__title">{tapeTitle(ARCHIVE_TAPE.id, language)}</span>
                  {arcadeDone ? (
                    <button type="button" className="secondary" onClick={loadArchive}>
                      {shell.deck.archiveOpen}
                    </button>
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
                <button type="button" className="secondary" onClick={closePanel}>
                  {shell.deck.close}
                </button>
              </div>
            </section>
          )}

          {panel === 'arcade' && <ArcadePanel onStart={startArcade} onClose={closePanel} />}

          {panel === 'ending' && archiveRestored && (
            <EndingScreen language={language} reducedDistortion={reducedDistortion} endings={journal.endings} onRestart={closePanel} />
          )}

          <AccessibilitySettings preferences={preferences} onChange={updatePreferences} />

          {panel === null && (
            <div className="info-card instructions">
              <p className="eyebrow">{shell.next.eyebrow}</p>
              <p>{shell.next.text}</p>
            </div>
          )}

          {import.meta.env.DEV && (
            <DemoControls
              clueFound={clueFound}
              arcadeDone={arcadeDone}
              session={session}
              onWinArcade={simulateArcadeWin}
              onToggleSecret={(secretId) => setSession((current) => toggleMinigameSecret(current, secretId))}
              onResetSession={() => setSession(EMPTY_SESSION)}
            />
          )}
        </aside>
      </div>

      <div className="journal-slot">
        <MemoryJournal language={language} entries={journal.entries} totalEntries={journal.totalEntries} atmosphere={journal.atmosphere} />
      </div>

      <footer>{shell.footer}</footer>
    </main>
  );
}
