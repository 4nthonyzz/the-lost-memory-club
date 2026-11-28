import { useEffect, useReducer, useRef, useState } from 'react';
import {
  FIRST_CLUE_ID,
  FIRST_TAPE_ID,
  MEMORY_ID,
  SAVE_KEY,
  SECRET_BOX_ID,
  type EndingId,
  type StationId,
} from './core/contracts';
import { gameReducer, loadGameState, saveGameState } from './core/gameReducer';
import {
  ACT_LINKS,
  canChooseEnding,
  isSecretEndingEligible,
  memberTitleKey,
  runSeconds,
  secretRequirementsMissing,
  unlockedEndingIds,
} from './core/progression';
import { buildJournalModel } from './memories/fragments/journalView';
import { ARCHIVE_TAPE, ACTS } from './memories/fragments/memoryCatalog';
import { localizeEndings } from './memories/fragments/narrativeText';
import { createIntroAudio, type IntroAudio, type IntroCue } from './memories/audio/introAudio';
import {
  clueEventFor,
  DEMO_ARCADE_SCORE,
  EMPTY_SESSION,
  isArchiveRestored,
  isPerfectTrackingDetection,
  progressFor,
  recordPerfectTracking,
  toggleMinigameSecret,
  type SessionProgress,
} from './memories/session';
import {
  deckOptions,
  objectiveLine,
  tapeById,
  unwatchedHeldTape,
  type DeckOption,
} from './memories/storyFlow';
import type { ClueDetection, TapeDefinition } from './memories/restoration/types';
import { VhsPlayerBoundary } from './memories/VhsPlayerBoundary';
import { AccessibilitySettings } from './ui/AccessibilitySettings';
import { ArcadeCabinets } from './ui/ArcadeCabinets';
import { CrtShutdown } from './ui/CrtShutdown';
import { EndingScreen } from './ui/EndingScreen';
import { ActionCutscene, type ActionCutsceneKind } from './ui/ActionCutscene';
import { arcadeAwakenedNotice, cabinetLabel, cabinetName, formatSecretRequirement, getFlowStrings } from './ui/flowStrings';
import { IntroSequence, type IntroPhaseIndex } from './ui/IntroSequence';
import { MemberCard } from './ui/MemberCard';
import { MemoryJournal } from './ui/MemoryJournal';
import { MemoryUnlockedCard } from './ui/MemoryUnlockedCard';
import { PlayScreen } from './ui/PlayScreen';
import { SaveIndicator } from './ui/SaveIndicator';
import { resolveSaveStatus } from './ui/saveStatus';
import { TapeShelf } from './ui/TapeShelf';
import { getUiStrings, type SaveStatus, type ShellNotice } from './ui/strings';
import { usePreferences } from './ui/usePreferences';
import type { EndingSceneId } from './ui/viewModels';
import { WorldScene } from './world/WorldScene';

type Panel = StationId | 'ending' | 'memory' | 'member' | null;
type PendingAction = {
  kind: ActionCutsceneKind;
  label?: string;
  machine?: string;
} | null;

/** -1 play screen, 0 to 2 opening sequence, 3 the world is running. */
type IntroPhase = -1 | IntroPhaseIndex | 3;

/** How long each opening phase lasts, in milliseconds. */
const INTRO_PHASE_MS: Record<IntroPhaseIndex, number> = { 0: 4000, 1: 2200, 2: 3800 };

/** Procedural sounds played when a phase starts. */
const INTRO_CUES: Record<IntroPhaseIndex, readonly IntroCue[]> = {
  0: ['cassette-click'],
  1: ['static-burst', 'soft-thunder'],
  2: [],
};

/** Quick wins and the demo panel only exist in the development build. */
const SHOW_DEV_TOOLS = import.meta.env.DEV;

interface DemoControlsProps {
  language: 'en' | 'es';
  session: SessionProgress;
  nextGameId: string | null;
  onWinNext: () => void;
  onToggleSecret: (secretId: string) => void;
  onResetSession: () => void;
}

function DemoControls({ language, session, nextGameId, onWinNext, onToggleSecret, onResetSession }: DemoControlsProps) {
  const es = language === 'es';
  return (
    <section className="info-card dev-panel" aria-label={es ? 'Controles de desarrollo y demo' : 'Dev and demo controls'}>
      <p className="eyebrow">{es ? 'CONTROLES DEV / DEMO' : 'DEV / DEMO CONTROLS'}</p>
      <p className="fineprint">{es ? 'Solo aparece en desarrollo. Estas banderas no se guardan.' : 'Shown only in development builds. Session flags are not saved.'}</p>
      <button type="button" className="secondary" disabled={nextGameId === null} onClick={onWinNext}>
        {nextGameId ? `${es ? 'Simular victoria' : 'Simulate win'}: ${cabinetName(nextGameId)}` : es ? 'No hay cabina abierta' : 'No cabinet open'}
      </button>
      <fieldset className="dev-panel__secrets">
        <legend>{es ? 'Secretos de minijuego' : 'Minigame secrets'}</legend>
        {ACTS.map((act) => (
          <label key={act.secret.id} className="dev-panel__check">
            <input type="checkbox" checked={session.minigameSecrets.includes(act.secret.id)} onChange={() => onToggleSecret(act.secret.id)} />
            <span>{`${act.gameName}: ${act.secret.label}`}</span>
          </label>
        ))}
      </fieldset>
      <button type="button" className="secondary" onClick={onResetSession}>
        {es ? 'Reiniciar banderas de sesión' : 'Reset session flags'}
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
  const [memoryMachine, setMemoryMachine] = useState('SNAKE.EXE');
  const [notice, setNotice] = useState<ShellNotice | null>(null);
  const [noticeDetail, setNoticeDetail] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [devOpen, setDevOpen] = useState(false);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() => (state.introCompleted ? 3 : -1));
  const [evidence, setEvidence] = useState<Readonly<Record<string, string>>>({});
  const [shutdownActive, setShutdownActive] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const pendingTapeRef = useRef<TapeDefinition | null>(null);
  const lastPhotoTapeRef = useRef<string | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const wasOpen = useRef(false);
  const wasIntro = useRef(false);
  const introAudioRef = useRef<IntroAudio | null>(null);

  const { language, reducedDistortion, muted } = preferences;
  // Read by the intro effect, which should not restart when the preference changes.
  const mutedRef = useRef(muted);
  const reducedRef = useRef(reducedDistortion);
  mutedRef.current = muted;
  reducedRef.current = reducedDistortion;

  const shell = getUiStrings(language).shell;
  const flow = getFlowStrings(language);
  const stationOpen = station !== null;
  const introActive = !state.introCompleted && introPhase >= 0 && introPhase < 3;
  const showPlayScreen = introPhase === -1 && !state.introCompleted;
  const archiveRestored = isArchiveRestored(state);
  const unlockedGames = ACT_LINKS.filter((link) => state.discoveredClues.includes(link.clueId)).map((link) => link.gameId);
  const arcadeDone = state.completedArcades.length > 0;
  const journal = buildJournalModel(state, progressFor(session), language);
  const endings = localizeEndings(unlockedEndingIds(state), language);
  const secretMissing = isSecretEndingEligible(state)
    ? []
    : secretRequirementsMissing(state).map((requirement) => formatSecretRequirement(requirement, language));
  const memberTitle = memberTitleKey(state);
  const playSeconds = runSeconds(state);
  const objective = introActive
    ? language === 'es' ? 'Mira el televisor\u2026' : 'Watch the television\u2026'
    : objectiveLine(state, language);

  /* ── Opening sequence: each phase owns its timer, so a phase change never cancels another phase ── */
  useEffect(() => {
    if (introPhase < 0 || introPhase >= 3) return undefined;
    const phase = introPhase as IntroPhaseIndex;
    const id = window.setTimeout(() => {
      setIntroPhase((current) => (current === phase ? ((phase + 1) as IntroPhase) : current));
    }, INTRO_PHASE_MS[phase]);
    return () => window.clearTimeout(id);
  }, [introPhase]);

  /* ── Reaching phase 3 saves the intro as complete ── */
  useEffect(() => {
    if (introPhase === 3 && !state.introCompleted) dispatch({ type: 'INTRO_COMPLETED' });
  }, [introPhase, state.introCompleted]);

  /* ── Sound for each opening phase ── */
  useEffect(() => {
    if (introPhase < 0 || introPhase >= 3 || mutedRef.current) return;
    const audio = introAudioRef.current;
    if (!audio) return;
    for (const cue of INTRO_CUES[introPhase as IntroPhaseIndex]) audio.play(cue, reducedRef.current);
  }, [introPhase]);

  /* ── When the opening ends, the world takes focus so WASD works after one Enter ── */
  useEffect(() => {
    if (wasIntro.current && !introActive) focusWorld();
    wasIntro.current = introActive;
  }, [introActive]);

  /* ── Persist the save ── */
  useEffect(() => {
    setSaveStatus('saving');
    saveGameState(state);
    setSaveStatus(resolveSaveStatus(JSON.stringify(state), () => window.localStorage.getItem(SAVE_KEY)));
  }, [state]);

  /* ── Notice auto-clear ── */
  useEffect(() => {
    if (!notice) {
      setNoticeDetail(null);
      return undefined;
    }
    if (notice !== 'arcadeAwakened') setNoticeDetail(null);
    const timer = window.setTimeout(() => {
      setNotice(null);
      setNoticeDetail(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /* ── Space skips the opening ── */
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

  /* ── Escape closes panels. The VHS deck handles its own keys once a tape is loaded. ── */
  useEffect(() => {
    if (!stationOpen) return undefined;
    if (pendingAction) return undefined;
    if (station === 'vhs' && deckTape) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closePanel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stationOpen, station, deckTape, archiveRestored, pendingAction]);

  /* ── Focus: dialogs focus their first control, and closing a dialog returns focus to the world ── */
  useEffect(() => {
    if (stationOpen) {
      // The VHS shelf, the deck and the cabinets focus their own controls.
      if (station !== 'vhs' && station !== 'arcade') {
        const first = dialogRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        (first ?? dialogRef.current)?.focus();
      }
    } else if (wasOpen.current) {
      focusWorld();
    }
    wasOpen.current = stationOpen;
  }, [stationOpen, station]);

  /* ── URL ?reset=1 starts a clean run immediately ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') !== '1') return;
    doReset();
    window.history.replaceState({}, document.title, window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────── actions ─────────── */

  function focusWorld() {
    shellRef.current?.querySelector<HTMLElement>('.world-wrapper')?.focus({ preventScroll: true });
  }

  function skipIntro() {
    setIntroPhase(3);
  }

  /** The PLAY click is a user gesture, so the audio context can start here. */
  function handlePlayScreen() {
    updatePreferences({ muted: false });
    const audio = introAudioRef.current ?? createIntroAudio();
    introAudioRef.current = audio;
    audio.unlock();
    dispatch({ type: 'RUN_STARTED', at: Date.now() });
    setIntroPhase(0);
  }

  function closePanel() {
    // Archive 09 leads straight to the endings.
    if (station === 'vhs' && deckTape?.id === MEMORY_ID && archiveRestored) {
      setDeckTape(null);
      setStation('ending');
      return;
    }
    if (station === 'vhs' && deckTape && lastPhotoTapeRef.current === deckTape.id) {
      const gameId = ACT_LINKS.find((link) => link.tapeId === deckTape.id)?.gameId;
      setDeckTape(null);
      setStation(null);
      if (gameId) {
        setPendingAction({ kind: 'clue-to-arcade', machine: cabinetLabel(gameId, language) });
      }
      lastPhotoTapeRef.current = null;
      return;
    }
    setDeckTape(null);
    setStation(null);
  }

  /** The TV plays an unwatched tape first. Otherwise it opens the shelf with the next new items. */
  function interact(next: StationId) {
    if (next === 'arcade') {
      if (unlockedGames.length === 0) {
        setNotice('arcadeLocked');
        return;
      }
      setStation('arcade');
      return;
    }
    const held = unwatchedHeldTape(state);
    if (held) {
      setDeckTape(held);
      setStation('vhs');
      return;
    }
    if (deckOptions(state).length === 0) {
      setNotice('needTape');
      return;
    }
    setDeckTape(null);
    setStation('vhs');
  }

  function pickDeckOption(option: DeckOption) {
    switch (option.kind) {
      case 'pickup': {
        const tape = tapeById(option.tapeId);
        if (!tape) return;
        dispatch({ type: 'TAPE_COLLECTED', tapeId: option.tapeId });
        setNotice('tapeCollected');
        pendingTapeRef.current = tape;
        setPendingAction({ kind: 'insert-tape', label: flow.action.tapeLabel(option.tapeId) });
        return;
      }
      case 'box':
        dispatch({ type: 'SECRET_BOX_COLLECTED', boxId: SECRET_BOX_ID });
        setNotice('boxCollected');
        return;
      case 'archive':
        dispatch({ type: 'MEMORY_RESTORED', memoryId: MEMORY_ID });
        setNotice('archiveLoaded');
        pendingTapeRef.current = ARCHIVE_TAPE;
        setPendingAction({ kind: 'insert-tape', label: flow.action.tapeLabel(MEMORY_ID) });
        return;
      case 'replay':
        setDeckTape(tapeById(option.tapeId));
        setStation('vhs');
        return;
    }
  }

  function finishPendingAction() {
    if (!pendingAction) return;
    if (pendingAction.kind === 'insert-tape' && pendingTapeRef.current) {
      setDeckTape(pendingTapeRef.current);
      pendingTapeRef.current = null;
      setStation('vhs');
    }
    if (pendingAction.kind === 'clue-to-arcade') {
      setNotice('polaroidDeveloped');
      focusWorld();
    }
    setPendingAction(null);
  }

  function handleDetection(detection: ClueDetection) {
    if (isPerfectTrackingDetection(detection)) {
      setSession(recordPerfectTracking);
      return;
    }
    dispatch(clueEventFor(detection));
    if (detection.tapeId === FIRST_TAPE_ID && detection.clueId === FIRST_CLUE_ID) {
      dispatch({ type: 'CALENDAR_SHIFTED', date: '31-09-98' });
      setNotice('calendarShifted');
    } else {
      setNotice('clueConfirmed');
    }
  }

  function handlePhotoCaptured(tapeId: string, photoId: string) {
    lastPhotoTapeRef.current = tapeId;
    dispatch({ type: 'PHOTO_CAPTURED', tapeId, photoId });
    setNotice('polaroidDeveloped');
  }

  function captureEvidence(detection: ClueDetection, image: string) {
    setEvidence((current) => ({ ...current, [`${detection.tapeId}:${detection.clueId}`]: image }));
  }

  /** A win comes with the real game id of the cabinet. The first win of each cabinet shows the unlock card. */
  function winArcade(gameId: string, score: number) {
    const firstWin = !state.completedArcades.includes(gameId);
    dispatch({ type: 'ARCADE_WON', gameId, score });
    if (!firstWin) {
      setStation(null);
      return;
    }
    setMemoryMachine(cabinetLabel(gameId, language));
    setNotice('arcadeAwakened');
    setNoticeDetail(arcadeAwakenedNotice(gameId, language));
    setStation('memory');
  }

  /** Records the choice and the run's end time. The scene stays on screen until the player continues. */
  function chooseEnding(id: EndingSceneId) {
    const endingId: EndingId = id;
    if (!canChooseEnding(state, endingId)) return;
    dispatch({ type: 'RUN_FINISHED', at: Date.now() });
    dispatch({ type: 'ENDING_CHOSEN', endingId });
  }

  function finishEnding() {
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

  function openCredential() {
    if (state.chosenEnding !== null) setStation('member');
  }

  function handlePowerOff() {
    setShutdownActive(true);
  }

  function onShutdownDone() {
    setShutdownActive(false);
    doReset();
  }

  function doReset() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage may be unavailable.
    }
    introAudioRef.current?.close();
    introAudioRef.current = null;
    dispatch({ type: 'RESET_DEMO' });
    setSession(EMPTY_SESSION);
    setEvidence({});
    setDeckTape(null);
    setStation(null);
    setDrawerOpen(false);
    setIntroPhase(-1);
    setResetArmed(false);
    setPendingAction(null);
    pendingTapeRef.current = null;
    lastPhotoTapeRef.current = null;
    setNotice('reset');
  }

  const dialogTitle =
    station === 'vhs' ? shell.deck.title
    : station === 'arcade' ? flow.arcade.heading
    : station === 'memory' ? (language === 'es' ? 'Recuerdo desbloqueado' : 'Memory unlocked')
    : station === 'member' ? (language === 'es' ? 'Credencial de socio' : 'Member card')
    : shell.progress.openEnding;

  return (
    <main className="game-shell" ref={shellRef}>
      {showPlayScreen && (
        <PlayScreen
          language={language}
          reducedDistortion={reducedDistortion}
          onPlay={handlePlayScreen}
          onLanguageChange={(nextLanguage) => updatePreferences({ language: nextLanguage })}
        />
      )}

      {!showPlayScreen && (
        <WorldScene inputEnabled={!stationOpen && !introActive} memoryShifted={arcadeDone} onInspect={interact} />
      )}

      {introActive && !showPlayScreen && (
        <IntroSequence phase={introPhase as IntroPhaseIndex} language={language} reducedDistortion={reducedDistortion} onSkip={skipIntro} />
      )}

      {!showPlayScreen && (
        <div className="run-actions" translate="no">
          {archiveRestored && (
            <button type="button" className="run-actions__endings" onClick={openEnding}>
              {flow.hud.endings}
            </button>
          )}
          {state.chosenEnding !== null && station === null && (
            <>
              <button type="button" onClick={openCredential}>
                {flow.hud.credential}
              </button>
              <button type="button" onClick={handlePowerOff}>
                {flow.hud.power}
              </button>
            </>
          )}
          {resetArmed ? (
            <div className="run-actions__confirm">
              <span>{flow.hud.resetAsk}</span>
              <button type="button" onClick={doReset}>
                {flow.hud.resetYes}
              </button>
              <button type="button" className="secondary" onClick={() => setResetArmed(false)}>
                {flow.hud.resetNo}
              </button>
            </div>
          ) : (
            <button type="button" className="run-actions__reset" onClick={() => setResetArmed(true)}>
              {flow.hud.reset}
            </button>
          )}
        </div>
      )}

      {!showPlayScreen && (
        <div className="hud-objective" role="status" translate="no">
          {objective}
        </div>
      )}

      {!showPlayScreen && !stationOpen && !introActive && <div className="hud-hint">{flow.hud.hint}</div>}

      {notice && (
        <div className="hud-status" role="status">
          {noticeDetail ?? shell.notices[notice]}
        </div>
      )}

      {!showPlayScreen && (
        <div className="hud-drawer">
          <button
            type="button"
            className="secondary"
            aria-expanded={drawerOpen}
            aria-controls="hud-drawer-body"
            onClick={() => setDrawerOpen((open) => !open)}
          >
            {drawerOpen ? (language === 'es' ? 'Cerrar men\u00fa' : 'Close menu') : language === 'es' ? 'Men\u00fa' : 'Menu'}
          </button>
          <div id="hud-drawer-body" className="hud-drawer-body" hidden={!drawerOpen}>
            <SaveIndicator status={saveStatus} language={language} />
            <AccessibilitySettings preferences={preferences} onChange={updatePreferences} />
            <button type="button" className="secondary" onClick={openEnding}>
              {shell.progress.openEnding}
            </button>
            <button type="button" className="secondary" onClick={() => setResetArmed(true)}>
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

      {stationOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePanel();
          }}
        >
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-label={dialogTitle} ref={dialogRef} tabIndex={-1} translate="no">
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
                onPhotoCaptured={handlePhotoCaptured}
                onClose={closePanel}
              />
            )}
            {station === 'vhs' && !deckTape && (
              <TapeShelf
                language={language}
                options={deckOptions(state)}
                capturedPhotos={state.capturedPhotos}
                onPick={pickDeckOption}
                onClose={closePanel}
              />
            )}
            {station === 'arcade' && (
              <ArcadeCabinets
                language={language}
                unlocked={unlockedGames}
                completed={state.completedArcades}
                allowSimulation={SHOW_DEV_TOOLS}
                reducedDistortion={reducedDistortion}
                muted={muted}
                onWin={winArcade}
                onClose={closePanel}
              />
            )}
            {station === 'memory' && (
              <MemoryUnlockedCard language={language} machine={memoryMachine} reducedDistortion={reducedDistortion} onClose={closePanel} />
            )}
            {station === 'ending' && archiveRestored && (
              <EndingScreen
                language={language}
                reducedDistortion={reducedDistortion}
                endings={endings}
                chosenId={state.chosenEnding}
                secretMissing={secretMissing}
                onChosen={chooseEnding}
                onFinish={finishEnding}
              />
            )}
            {station === 'member' && state.chosenEnding !== null && (
              <MemberCard
                language={language}
                titleKey={memberTitle}
                polaroidCount={state.capturedPhotos.length}
                arcadeCount={state.completedArcades.length}
                playSeconds={playSeconds}
                onPower={handlePowerOff}
                onClose={closePanel}
              />
            )}
          </div>
        </div>
      )}

      {pendingAction && (
        <ActionCutscene
          kind={pendingAction.kind}
          language={language}
          reducedDistortion={reducedDistortion}
          muted={muted}
          skipAnimation={import.meta.env.MODE === 'test'}
          label={pendingAction.label}
          machine={pendingAction.machine}
          onDone={finishPendingAction}
        />
      )}

      {shutdownActive && <CrtShutdown reducedDistortion={reducedDistortion} onDone={onShutdownDone} />}

      {SHOW_DEV_TOOLS && (
        <>
          <button type="button" className="dev-toggle" aria-expanded={devOpen} onClick={() => setDevOpen((open) => !open)}>
            {'\u2699 Dev'}
          </button>
          {devOpen && (
            <div className="dev-drawer">
              <DemoControls
                language={language}
                session={session}
                nextGameId={unlockedGames.find((id) => !state.completedArcades.includes(id)) ?? null}
                onWinNext={() => {
                  const next = unlockedGames.find((id) => !state.completedArcades.includes(id));
                  if (next) winArcade(next, DEMO_ARCADE_SCORE);
                }}
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
