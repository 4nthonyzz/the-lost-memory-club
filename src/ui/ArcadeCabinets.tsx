import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import './ui.css';
import { DEAD_FREQUENCY_GAME_ID, SHADOW_FIGHT_GAME_ID, SNAKE_GAME_ID } from '../core/contracts';
import { ACT_LINKS } from '../core/progression';
import { ACTS } from '../memories/fragments/memoryCatalog';
import { DEMO_ARCADE_SCORE } from '../memories/session';
import { advance, createSnake, snakeScore, steer, SNAKE_COLS, SNAKE_GOAL, SNAKE_ROWS, type SnakeState } from '../memories/minigames/snake';
import { createShadowFight, press, SHADOW_ROUNDS, shadowScore, type Move, type ShadowFightState } from '../memories/minigames/shadowFight';
import {
  createDeadFrequency,
  DIAL_MAX,
  DIAL_MIN,
  DIAL_TARGET,
  DIAL_TOLERANCE,
  deadFrequencyScore,
  LOCK_MS,
  setHolding,
  tick,
  tune,
  type DeadFrequencyState,
} from '../memories/minigames/deadFrequency';
import { getFlowStrings, type ArcadeKind, cabinetLabel } from './flowStrings';
import { ActionCutscene } from './ActionCutscene';
import type { Language } from './preferences';
import { getUiStrings } from './strings';

export interface ArcadeCabinetsProps {
  language: Language;
  /** Game ids whose clue has been found. Only these cabinets can be played. */
  unlocked: readonly string[];
  /** Game ids already beaten. */
  completed: readonly string[];
  /** Quick win for demos. Only the development build shows it. */
  allowSimulation: boolean;
  /** Reduced distortion skips the fast visual cut but keeps the transition. */
  reducedDistortion?: boolean;
  muted?: boolean;
  /** Test mode can skip the 1.1 second action cut. */
  skipActionAnimations?: boolean;
  onWin: (gameId: string, score: number) => void;
  onClose: () => void;
}

type GameKind = ArcadeKind;

const KIND_BY_GAME: Readonly<Record<string, GameKind>> = {
  [SNAKE_GAME_ID]: 'snake',
  [SHADOW_FIGHT_GAME_ID]: 'shadow',
  [DEAD_FREQUENCY_GAME_ID]: 'dead',
};

const CABINETS = ACT_LINKS.map((link) => ({
  gameId: link.gameId,
  act: link.act,
  kind: KIND_BY_GAME[link.gameId]!,
  name: ACTS.find((entry) => entry.gameId === link.gameId)?.gameName ?? link.gameId,
}));

const SNAKE_SEED = 11;
const SHADOW_SEED = 7;
const SNAKE_TICK_MS = 140;
const DEAD_TICK_MS = 50;

const MOVE_KEYS: Readonly<Record<string, Move>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

const ARROW_SYMBOL: Readonly<Record<Move, string>> = {
  up: '\u25b2',
  down: '\u25bc',
  left: '\u25c0',
  right: '\u25b6',
};

interface GameProps {
  language: Language;
  onWin: (score: number) => void;
}

/** SNAKE.EXE: eat the apples, avoid the walls and the body. */
function SnakeGame({ language, onWin }: GameProps) {
  const strings = getFlowStrings(language).arcade;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reported = useRef(false);
  const [runs, setRuns] = useState(0);
  const [game, setGame] = useState<SnakeState>(() => createSnake(SNAKE_SEED));

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (game.status !== 'running') return undefined;
    const id = window.setInterval(() => setGame((current) => advance(current)), SNAKE_TICK_MS);
    return () => window.clearInterval(id);
  }, [game.status]);

  useEffect(() => {
    if (game.status === 'won' && !reported.current) {
      reported.current = true;
      onWin(snakeScore(game));
    }
  }, [game, onWin]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = MOVE_KEYS[event.key];
    if (move) {
      event.preventDefault();
      setGame((current) => steer(current, move));
      return;
    }
    if (event.key === 'Enter' && game.status === 'lost') {
      event.preventDefault();
      const next = runs + 1;
      setRuns(next);
      setGame(createSnake(SNAKE_SEED + next * 7919));
    }
  }

  const cells: ReactElement[] = [];
  for (let y = 0; y < SNAKE_ROWS; y += 1) {
    for (let x = 0; x < SNAKE_COLS; x += 1) {
      const head = game.body[0]!;
      const isHead = head.x === x && head.y === y;
      const isBody = !isHead && game.body.some((part) => part.x === x && part.y === y);
      const isFood = game.food.x === x && game.food.y === y;
      const type = isHead ? ' snake-cell--head' : isBody ? ' snake-cell--body' : isFood ? ' snake-cell--food' : '';
      cells.push(<span key={`${x}-${y}`} className={`snake-cell${type}`} />);
    }
  }

  return (
    <div ref={rootRef} tabIndex={-1} className="arcade-game" onKeyDown={onKeyDown}>
      <div className="snake-board" role="img" aria-label={strings.apples(game.eaten, SNAKE_GOAL)} style={{ gridTemplateColumns: `repeat(${SNAKE_COLS}, 1fr)` }}>
        {cells}
      </div>
      <p className="arcade-game__score">{strings.apples(game.eaten, SNAKE_GOAL)}</p>
      {game.status === 'lost' && <p role="status">{strings.lost}</p>}
      {game.status === 'won' && <p role="status">{strings.won}</p>}
    </div>
  );
}

/** SHADOW FIGHT: repeat the stance the shadow shows, with the arrow keys or WASD. */
function ShadowGame({ language, onWin }: GameProps) {
  const strings = getFlowStrings(language).arcade;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reported = useRef(false);
  const [game, setGame] = useState<ShadowFightState>(() => createShadowFight(SHADOW_SEED));

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (game.status === 'won' && !reported.current) {
      reported.current = true;
      onWin(shadowScore(game));
    }
  }, [game, onWin]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = MOVE_KEYS[event.key];
    if (!move) return;
    event.preventDefault();
    setGame((current) => press(current, move));
  }

  return (
    <div ref={rootRef} tabIndex={-1} className="arcade-game" onKeyDown={onKeyDown}>
      <p className="arcade-game__score">{strings.round(Math.min(game.round + 1, SHADOW_ROUNDS), SHADOW_ROUNDS)}</p>
      <p className="shadow-stance" aria-label={strings.misses(game.misses)}>
        {game.sequence.map((move, index) => (
          <span key={index} className={index < game.entered.length ? 'shadow-step shadow-step--done' : 'shadow-step'}>
            {ARROW_SYMBOL[move]}
          </span>
        ))}
      </p>
      <p className="arcade-game__score">{strings.misses(game.misses)}</p>
      {game.status === 'won' && <p role="status">{strings.won}</p>}
    </div>
  );
}

/** DEAD FREQUENCY: tune the dial into the band and hold the lock until it catches. */
function DeadGame({ language, onWin }: GameProps) {
  const strings = getFlowStrings(language).arcade;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reported = useRef(false);
  const [game, setGame] = useState<DeadFrequencyState>(createDeadFrequency);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (game.status !== 'running') return undefined;
    const id = window.setInterval(() => setGame((current) => tick(current, DEAD_TICK_MS)), DEAD_TICK_MS);
    return () => window.clearInterval(id);
  }, [game.status]);

  useEffect(() => {
    if (game.status === 'won' && !reported.current) {
      reported.current = true;
      onWin(deadFrequencyScore(game));
    }
  }, [game, onWin]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      event.preventDefault();
      setGame((current) => tune(current, -1));
    } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      setGame((current) => tune(current, 1));
    } else if (event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) setGame((current) => setHolding(current, true));
    }
  }

  function onKeyUp(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== ' ') return;
    event.preventDefault();
    setGame((current) => setHolding(current, false));
  }

  const range = DIAL_MAX - DIAL_MIN;
  const needle = ((game.dial - DIAL_MIN) / range) * 100;
  const bandLeft = ((DIAL_TARGET - DIAL_TOLERANCE - DIAL_MIN) / range) * 100;
  const bandWidth = ((2 * DIAL_TOLERANCE) / range) * 100;
  const percent = Math.round((game.lockedMs / LOCK_MS) * 100);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="arcade-game"
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => setGame((current) => setHolding(current, false))}
    >
      <div className="dead-dial" role="progressbar" aria-label={strings.dial} aria-valuemin={DIAL_MIN} aria-valuemax={DIAL_MAX} aria-valuenow={game.dial}>
        <span className="dead-dial__band" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
        <span className="dead-dial__needle" style={{ left: `${needle}%` }} />
      </div>
      <p className="arcade-game__score">{strings.lockProgress(game.status === 'won' ? 100 : percent)}</p>
      {game.status === 'won' && <p role="status">{strings.won}</p>}
    </div>
  );
}

/**
 * The three cabinets. A cabinet opens once its clue is found. The player plays its mini game here,
 * and a development build can also record a quick win. Each win reports the real game id.
 */
export function ArcadeCabinets({ language, unlocked, completed, allowSimulation, reducedDistortion = false, muted = false, skipActionAnimations = import.meta.env.MODE === 'test', onWin, onClose }: ArcadeCabinetsProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [actionGameId, setActionGameId] = useState<string | null>(null);
  const strings = getFlowStrings(language).arcade;
  const closeLabel = getUiStrings(language).shell.deck.close;
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (selected === null) rootRef.current?.focus();
  }, [selected]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (selected !== null) setSelected(null);
    else onClose();
  }

  if (selected !== null) {
    const kind = KIND_BY_GAME[selected];
    const name = cabinetLabel(selected, language);
    const report = (score: number) => onWin(selected, score);
    return (
      <section ref={rootRef} tabIndex={-1} role="region" className="arcade-cabinets arcade-cabinets--playing" aria-label={name} lang={language} onKeyDown={onKeyDown}>
        <p className="eyebrow" translate="no">{name}</p>
        <p className="fineprint">{kind ? strings.help[kind] : ''}</p>
        {kind === 'snake' && <SnakeGame key={selected} language={language} onWin={report} />}
        {kind === 'shadow' && <ShadowGame key={selected} language={language} onWin={report} />}
        {kind === 'dead' && <DeadGame key={selected} language={language} onWin={report} />}
        <p className="fineprint">{strings.escape}</p>
        <button type="button" className="secondary" onClick={() => setSelected(null)}>
          {strings.back}
        </button>
      </section>
    );
  }

  return (
    <section ref={rootRef} tabIndex={-1} className="arcade-cabinets" aria-labelledby="arcade-cabinets-title" lang={language} onKeyDown={onKeyDown}>
      <p className="eyebrow">{language === 'es' ? 'ARCADE / MÓDULO 02' : 'ARCADE / MODULE 02'}</p>
      <h2 id="arcade-cabinets-title">{strings.heading}</h2>
      <p>{strings.intro}</p>
      {actionGameId !== null && (
        <ActionCutscene
          kind="insert-coin"
          language={language}
          reducedDistortion={reducedDistortion}
          muted={muted}
          skipAnimation={skipActionAnimations}
          machine={cabinetLabel(actionGameId, language)}
          onDone={() => {
            const nextGame = actionGameId;
            setActionGameId(null);
            setSelected(nextGame);
          }}
        />
      )}
      <ul className="arcade-cabinets__list">
        {CABINETS.map((cabinet) => {
          const isUnlocked = unlocked.includes(cabinet.gameId);
          const isDone = completed.includes(cabinet.gameId);
          const status = !isUnlocked ? strings.lockedBy(cabinet.act) : isDone ? strings.done : strings.ready;
          return (
            <li
              key={cabinet.gameId}
              className={`arcade-cabinet${isUnlocked ? '' : ' arcade-cabinet--locked'}${isDone ? ' arcade-cabinet--done' : ''}`}
            >
              <span className="arcade-cabinet__name" translate="no">{strings.label[cabinet.kind]}</span>
              <span className="arcade-cabinet__status">{status}</span>
              <span className="arcade-cabinet__actions">
                <button type="button" disabled={!isUnlocked} onClick={() => setActionGameId(cabinet.gameId)}>
                  {strings.play}
                </button>
                {allowSimulation && isUnlocked && !isDone && (
                  <button type="button" className="secondary" onClick={() => onWin(cabinet.gameId, DEMO_ARCADE_SCORE)}>
                    {strings.simulate}
                  </button>
                )}
              </span>
              <p className="arcade-cabinet__lore">{strings.lore[cabinet.kind]}</p>
            </li>
          );
        })}
      </ul>
      <button type="button" className="secondary" onClick={onClose}>
        {closeLabel}
      </button>
    </section>
  );
}
