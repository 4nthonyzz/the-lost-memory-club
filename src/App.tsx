import { useEffect, useReducer, useRef, useState } from 'react';
import { ArcadePanel } from './arcade/ArcadePanel';
import {
  FIRST_CLUE_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SAVE_KEY,
  SECRET_BOX_ID,
  SNAKE_GAME_ID,
  type EndingId,
  type StationId,
} from './core/contracts';
import { gameReducer, loadGameState, saveGameState } from './core/gameReducer';
import { buildJournalModel } from './memories/fragments/journalView';
import { ACTS } from './memories/fragments/memoryCatalog';
import { localizeEndings } from './memories/fragments/narrativeText';
import {
  clueEventFor,
  DEMO_ARCADE_SCORE,
  EMPTY_SESSION,
  isArchiveRestored,
  isClueFound,
  isPerfectTrackingDetection,
  progressFor,
  recordPerfectTracking,
  toggleMinigameSecret,
  type SessionProgress,
} from './memories/session';
import {
  availableCollectibles,
  collectEvent,
  nextTape,
  objectiveLine,
  secretEndingEligible,
  tvCalling,
  unlockedEndingIds,
} from './memories/storyFlow';
import type { ClueDetection, TapeDefinition } from './memories/restoration/types';
import { VhsPlayerBoundary } from './memories/VhsPlayerBoundary';
import { AccessibilitySettings } from './ui/AccessibilitySettings';
import { CrtCorruptionOverlay } from './ui/CrtCorruptionOverlay';
import { CrtShutdown } from './ui/CrtShutdown';
import { EndingScreen } from './ui/EndingScreen';
import { MemberCard } from './ui/MemberCard';
import { MemoryJournal } from './ui/MemoryJournal';
import { MemoryUnlockedCard } from './ui/MemoryUnlockedCard';
import { PlayScreen } from './ui/PlayScreen';
import { SaveIndicator } from './ui/SaveIndicator';
import { resolveSaveStatus } from './ui/saveStatus';
import { getUiStrings, type SaveStatus, type ShellNotice } from './ui/strings';
import { usePreferences } from './ui/usePreferences';
import { WorldScene } from './world/WorldScene';

type Panel = StationId | 'ending' | 'memory' | 'member' | null;

/** introPhase: -1=play screen, 0=warm CRT, 1=sparks, 2=wake thought, 3=game running */
type IntroPhase = -1 | 0 | 1 | 2 | 3;

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
            <input
              type="checkbox"
              checked={session.minigameSecrets.includes(act.secret.id)}
              onChange={() => onToggleSecret(act.secret.id)}
            />
            <span>{`${act.gameName}: ${act.secret.label}`}</span>
          </label>
        ))}
      </fieldset>
      <button type="button" className="secondary" onClick={onResetSession}>
        Reset session flags
      </button>
    </section>
  );
}

const INTRO_THOUGHT = {
  en: 'Where am I?\u2026 Midnight Rentals? But this place closed ten years ago\u2026',
  es: '\u00bfD\u00f3nde estoy?\u2026 \u00bfMidnight Rentals? Pero este lugar cerr\u00f3 hace diez a\u00f1os\u2026',
} as const;

function secretMissingList(state: ReturnType<typeof loadGameState>, language: 'en' | 'es'): string[] {
  const es = language === 'es';
  const missing: string[] = [];
  const tapes = [FIRST_TAPE_ID, 'tape-002', 'tape-003'] as const;
  for (const id of tapes) {
    if (!state.collectedTapes.includes(id)) {
      missing.push(es ? `cinta ${id}` : `tape ${id}`);
    }
  }
  if (state.completedArcades.length === 0) missing.push(es ? 'ganar 1 Arcade' : 'win 1 Arcade');
  if (!state.collectedSecrets.includes(SECRET_BOX_ID)) missing.push(es ? 'caja secreta' : 'secret box');
  return missing;
}

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadGameState);
  const [preferences, updatePreferences] = usePreferences();
  const [session, setSession] = useState<SessionProgress>(EMPTY_SESSION);
  const [station, setStation] = useState<Panel>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deckTape, setDeckTape] = useState<TapeDefinition | null>(null);
  const [memoryMachine, setMemoryMachine] = useState('SNAKE.EXE');
  const [notice, setNotice] = useState<ShellNotice | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [devOpen, setDevOpen] = useState(false);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() =>
    state.introCompleted ? 3 : -1
  );
  const [evidence, setEvidence] = useState<Readonly<Record<string, string>>>({});
  const [shutdownActive, setShutdownActive] = useState(false);
  const startTimeRef = useRef(Date.now());
  const shellRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);
  const resumePointerLockRef = useRef<(() => void) | null>(null);

  const { language, reducedDistortion, muted } = preferences;
  const shell = getUiStrings(language).shell;
  const stationOpen = station !== null;
  const clueFound = isClueFound(state);
  const arcadeDone = state.completedArcades.length > 0;
  const archiveRestored = isArchiveRestored(state);
  const introActive = !state.introCompleted && introPhase >= 0 && introPhase < 3;
  const showPlayScreen = introPhase === -1 && !state.introCompleted;
  const journal = buildJournalModel(state, progressFor(session), language);
  const endings = localizeEndings(unlockedEndingIds(state), language);
  const shifted = state.calendarDate === '31\u002D09-98';
  const secretReady = secretEndingEligible(state);
  const secretMissing = secretReady ? [] : secretMissingList(state, language);

  /* ── Intro timer (runs only when introPhase >= 0) ── */
  useEffect(() => {
    if (state.introCompleted || introPhase < 0) return undefined;
    if (introPhase !== 0) return undefined;
    const glitch = window.setTimeout(() => setIntroPhase(1), 3000);
    const wake = window.setTimeout(() => setIntroPhase(2), 4500);
    const done = window.setTimeout(() => {
      setIntroPhase(3);
      dispatch({ type: 'INTRO_COMPLETED' });
    }, 8000);
    return () => {
      window.clearTimeout(glitch);
      window.clearTimeout(wake);
      window.clearTimeout(done);
    };
  }, [state.introCompleted, introPhase]);

  /* ── Persist save ── */
  useEffect(() => {
    setSaveStatus('saving');
    saveGameState(state);
    setSaveStatus(resolveSaveStatus(JSON.stringify(state), () => window.localStorage.getItem(SAVE_KEY)));
  }, [state]);

  /* ── Notice auto-clear ── */
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /* ── Space skips intro ── */
  useEffect(() => {
    if (!introActive) return undefined;
    function skip(event: KeyboardEvent) {
      if (event.code !== 'Space') return;
      event.preventDefault();
      skipIntro();
    }
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [introActive]);

  /* ── Escape closes non-VHS panels ── */
  useEffect(() => {
    if (!stationOpen || station === 'vhs') return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closePanel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stationOpen, station]);

  /* ── Focus management ── */
  useEffect(() => {
    if (stationOpen) {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (station !== 'vhs') (first ?? dialogRef.current)?.focus();
    } else if (wasOpen.current) {
      shellRef.current?.querySelector<HTMLElement>('.world-wrapper')?.focus();
    }
    wasOpen.current = stationOpen;
  }, [stationOpen, station]);

  /* ── URL ?reset=1 ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') !== '1') return;
    doReset();
    window.history.replaceState({}, document.title, window.location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────── actions ─────────── */

  function skipIntro() {
    setIntroPhase(3);
    dispatch({ type: 'INTRO_COMPLETED' });
  }

  /** Called when the player clicks [ PLAY ▶ ] on the start screen. */
  function handlePlayScreen() {
    updatePreferences({ muted: false });
    setIntroPhase(0);
  }

  function closePanel() {
    // Archive 09 → go straight to endings
    if (station === 'vhs' && deckTape?.id === MEMORY_ID && archiveRestored) {
      setDeckTape(null);
      setStation('ending');
      return;
    }
    if (station === 'vhs' && deckTape?.id === FIRST_TAPE_ID && state.discoveredClues.includes(FIRST_CLUE_ID)) {
      dispatch({ type: 'CALENDAR_SHIFTED', date: '31-09-98' });
    }
    setStation(null);
    setDeckTape(null);
    // Restore pointer lock in the same frame the user clicked/pressed
    window.setTimeout(() => {
      resumePointerLockRef.current?.();
    }, 0);
  }

  function interact(nextStation: StationId) {
    if (nextStation === 'arcade') {
      if (!clueFound) {
        setNotice('arcadeLocked');
        return;
      }
      setStation('arcade');
      return;
    }
    const tape = nextTape(state);
    if (!tape) {
      setNotice('needTape');
      return;
    }
    if (tape.id === MEMORY_ID) dispatch({ type: 'MEMORY_RESTORED', memoryId: MEMORY_ID });
    setDeckTape(tape);
    setStation('vhs');
  }

  function collectWorldItem(id: string) {
    const event = collectEvent(id);
    if (event) dispatch(event);
  }

  function captureEvidence(detection: ClueDetection, image: string) {
    setEvidence((current) => ({ ...current, [`${detection.tapeId}:${detection.clueId}`]: image }));
  }

  function handleDetection(detection: ClueDetection) {
    if (isPerfectTrackingDetection(detection)) {
      setSession(recordPerfectTracking);
      return;
    }
    dispatch(clueEventFor(detection));
    if (detection.tapeId === FIRST_TAPE_ID && detection.clueId === FIRST_CLUE_ID) {
      dispatch({ type: 'CALENDAR_SHIFTED', date: '31-09-98' });
    }
  }

  function startArcade(gameId: string) {
    dispatch({ type: 'ARCADE_STARTED', gameId });
  }

  function winArcade(gameId: string, score: number, machine: string) {
    dispatch({ type: 'ARCADE_WON', gameId, score });
    setMemoryMachine(machine);
    setStation('memory');
  }

  function chooseEnding(id: EndingId) {
    dispatch({ type: 'ENDING_CHOSEN', endingId: id });
    // After choosing, show the member card
    setStation('member');
  }

  function openEnding() {
    if (!archiveRestored) {
      setNotice('endingLocked');
      return;
    }
    setDrawerOpen(false);
    setStation('ending');
  }

  function handlePowerOff() {
    setShutdownActive(true);
  }

  function onShutdownDone() {
    setShutdownActive(false);
    setStation(null);
    doReset();
  }

  function doReset() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage may be unavailable.
    }
    dispatch({ type: 'RESET_DEMO' });
    setSession(EMPTY_SESSION);
    setEvidence({});
    setDeckTape(null);
    setStation(null);
    setDrawerOpen(false);
    setIntroPhase(-1);
    setNotice('reset');
    startTimeRef.current = Date.now();
  }

  const dialogTitle =
    station === 'vhs' ? shell.deck.title
    : station === 'arcade' ? 'Arcade station'
    : station === 'memory' ? (language === 'es' ? 'Recuerdo desbloqueado' : 'Memory unlocked')
    : station === 'member' ? (language === 'es' ? 'Credencial de socio' : 'Member card')
    : shell.progress.openEnding;
  const objective =
    introActive
      ? language === 'es' ? 'Mira el televisor\u2026' : 'Watch the television\u2026'
      : objectiveLine(state, language);

  const playSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <main className="game-shell" ref={shellRef}>
      {/* Play-screen gate: shown before intro when not yet completed */}
      {showPlayScreen && (
        <PlayScreen
          language={language}
          reducedDistortion={reducedDistortion}
          onPlay={handlePlayScreen}
        />
      )}

      {/* 3D World */}
      {!showPlayScreen && (
        <WorldScene
          inputEnabled={!stationOpen && !introActive}
          onPointerLockReady={(resume) => { resumePointerLockRef.current = resume; }}
          onCollectibleInteract={collectWorldItem}
          calendarDate={state.calendarDate}
          availableCollectibles={availableCollectibles(state)}
          tvCalling={!stationOpen && tvCalling(state)}
          vcrPlaying={station === 'vhs'}
          arcadeLit={shifted}
          calmMotion={reducedDistortion}
          corkPolaroids={state.capturedPhotos.length + state.completedArcades.length}
          wakeUp={introActive && introPhase === 2}
          onInspect={interact}
          memoryShifted={arcadeDone}
        />
      )}

      {/* Intro overlay (phases 0-2) */}
      {introActive && !showPlayScreen && (
        <div
          className={`intro-sequence intro-sequence--${introPhase}`}
          role="status"
          aria-live="polite"
          translate="no"
        >
          <button type="button" className="intro-skip" onClick={skipIntro}>
            {language === 'es' ? 'Saltar [Espacio]' : 'Skip [Space]'}
          </button>
          {introPhase === 0 && (
            <div className="intro-crt-memory">
              {`PLAY \u25B6 31-09-98`}
              <br />
              <span>{'MAYA \u00B7 LEO \u00B7 SAM \u00B7 JULIAN'}</span>
            </div>
          )}
          {introPhase === 1 && <div className="intro-sparks">{'\u26A1 \u26A1'}</div>}
          {introPhase === 2 && (
            <div className="intro-thought" lang={language}>
              {INTRO_THOUGHT[language]}
            </div>
          )}
        </div>
      )}
      {introActive && introPhase < 2 && !showPlayScreen && (
        <CrtCorruptionOverlay level={introPhase === 1 ? 1 : 0.65} reducedDistortion={reducedDistortion} />
      )}

      {/* Persistent HUD buttons (top-right) */}
      {!showPlayScreen && (
        <div className="run-actions" translate="no">
          {archiveRestored && (
            <button type="button" className="run-actions__endings" onClick={openEnding}>
              {language === 'es' ? 'Ver finales' : 'View endings'}
            </button>
          )}
          <button type="button" className="run-actions__reset" onClick={doReset}>
            {language === 'es' ? '\u21BB Reiniciar' : '\u21BB Reset'}
          </button>
        </div>
      )}

      {/* Objective line */}
      {!showPlayScreen && (
        <div className="hud-objective" role="status" translate="no">
          {objective}
        </div>
      )}

      {/* Notice toasts */}
      {notice && (
        <div className="hud-status" role="status">
          {shell.notices[notice]}
        </div>
      )}

      {/* Slide-out menu */}
      {!showPlayScreen && (
        <div className="hud-drawer">
          <button
            type="button"
            className="secondary"
            aria-expanded={drawerOpen}
            aria-controls="hud-drawer-body"
            onClick={() => setDrawerOpen((open) => !open)}
          >
            {drawerOpen
              ? language === 'es' ? 'Cerrar men\u00FA' : 'Close menu'
              : language === 'es' ? 'Men\u00FA' : 'Menu'}
          </button>
          <div id="hud-drawer-body" className="hud-drawer-body" hidden={!drawerOpen}>
            <SaveIndicator status={saveStatus} language={language} />
            <AccessibilitySettings preferences={preferences} onChange={updatePreferences} />
            <button type="button" className="secondary" onClick={openEnding}>
              {shell.progress.openEnding}
            </button>
            <button type="button" className="secondary" onClick={doReset}>
              {shell.progress.reset}
            </button>
            <MemoryJournal
              language={language}
              entries={journal.entries}
              totalEntries={journal.totalEntries}
              atmosphere={journal.atmosphere}
              evidence={evidence}
            />
          </div>
        </div>
      )}

      {/* Modal panels */}
      {stationOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={dialogTitle}
            ref={dialogRef}
            tabIndex={-1}
            translate="no"
          >
            {station === 'vhs' && deckTape && (
              <VhsPlayerBoundary
                key={deckTape.id}
                tape={deckTape}
                language={language}
                reducedDistortion={reducedDistortion}
                muted={muted}
                onMutedChange={(value) => updatePreferences({ muted: value })}
                onClueDetected={handleDetection}
                onEvidenceCaptured={captureEvidence}
                onPhotoCaptured={(tapeId, photoId) => dispatch({ type: 'PHOTO_CAPTURED', tapeId, photoId })}
                onClose={closePanel}
              />
            )}
            {station === 'arcade' && (
              <ArcadePanel
                onStart={startArcade}
                onWin={(_, score) => winArcade(SNAKE_GAME_ID, score, 'SNAKE.EXE')}
                onClose={closePanel}
              />
            )}
            {station === 'memory' && (
              <MemoryUnlockedCard
                language={language}
                machine={memoryMachine}
                reducedDistortion={reducedDistortion}
                onClose={closePanel}
              />
            )}
            {station === 'ending' && archiveRestored && (
              <EndingScreen
                language={language}
                reducedDistortion={reducedDistortion}
                endings={endings}
                secretMissing={secretMissing}
                onChosen={chooseEnding}
                onRestart={closePanel}
              />
            )}
            {station === 'member' && state.chosenEnding && (
              <MemberCard
                language={language}
                endingId={state.chosenEnding}
                polaroidCount={state.capturedPhotos.length}
                arcadeCount={state.completedArcades.length}
                playSeconds={playSeconds}
                onPower={handlePowerOff}
              />
            )}
          </div>
        </div>
      )}

      {/* CRT shutdown animation */}
      {shutdownActive && (
        <CrtShutdown reducedDistortion={reducedDistortion} onDone={onShutdownDone} />
      )}

      {/* Dev panel */}
      {import.meta.env.DEV && (
        <>
          <button
            type="button"
            className="dev-toggle"
            aria-expanded={devOpen}
            onClick={() => setDevOpen((open) => !open)}
          >
            {'\u2699 Dev'}
          </button>
          {devOpen && (
            <div className="dev-drawer">
              <DemoControls
                clueFound={clueFound}
                arcadeDone={arcadeDone}
                session={session}
                onWinArcade={() => winArcade(SNAKE_GAME_ID, DEMO_ARCADE_SCORE, 'SNAKE.EXE')}
                onToggleSecret={(secretId) => setSession((current) => toggleMinigameSecret(current, secretId))}
                onResetSession={() => setSession(EMPTY_SESSION)}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
