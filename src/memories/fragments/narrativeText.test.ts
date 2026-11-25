import { describe, expect, it } from 'vitest';
import { FIRST_CLUE_ID, FIRST_TAPE_ID, MEMORY_ID, SNAKE_GAME_ID, type GameEvent } from '../../core/contracts';
import { createInitialState, gameReducer } from '../../core/gameReducer';
import { buildJournalModel } from './journalView';
import { ACTS, ENDINGS } from './memoryCatalog';
import { evaluateNarrativeState, narrativeFor } from './narrativeEvaluator';
import {
  describeObjective,
  ENDINGS_ES,
  FRAGMENT_CAPTIONS,
  FRAGMENT_COPY_ES,
  localizeAtmosphere,
  localizeEnding,
  localizeFragment,
  STAGE_COPY_ES,
  TAPE_TITLES_ES,
  type NarrativeObjective,
} from './narrativeText';

const events: GameEvent[] = [
  { type: 'TAPE_COLLECTED', tapeId: FIRST_TAPE_ID },
  { type: 'VHS_CLUE_FOUND', tapeId: FIRST_TAPE_ID, clueId: FIRST_CLUE_ID },
  { type: 'ARCADE_WON', gameId: SNAKE_GAME_ID, score: 10 },
  { type: 'MEMORY_RESTORED', memoryId: MEMORY_ID },
];
const finished = events.reduce(gameReducer, createInitialState());

const everything = evaluateNarrativeState(finished, {
  collectedTapes: ACTS.map((act) => act.tape.id),
  discoveredClues: ACTS.map((act) => act.clueId),
  completedGames: ACTS.map((act) => act.gameId),
  minigameSecrets: ACTS.map((act) => act.secret.id),
  perfectTrackingArchive: true,
});

describe('Spanish narrative coverage', () => {
  it('translates every fragment the evaluator can produce', () => {
    expect(everything.fragments).toHaveLength(everything.totalFragments);
    for (const fragment of everything.fragments) {
      const spanish = FRAGMENT_COPY_ES[fragment.id];
      expect(spanish?.title.length).toBeGreaterThan(0);
      expect(spanish?.text.length).toBeGreaterThan(0);
      expect(spanish?.text).not.toBe(fragment.text);
      expect(FRAGMENT_CAPTIONS[fragment.id]?.en.length).toBeGreaterThan(0);
      expect(FRAGMENT_CAPTIONS[fragment.id]?.es.length).toBeGreaterThan(0);
    }
  });

  it('translates every tape title, ending and club stage', () => {
    for (const act of ACTS) expect(TAPE_TITLES_ES[act.tape.id]).toBeTruthy();
    for (const ending of ENDINGS) {
      expect(ENDINGS_ES[ending.id].title.length).toBeGreaterThan(0);
      expect(ENDINGS_ES[ending.id].text).not.toBe(ending.text);
    }
    for (const stage of Object.values(STAGE_COPY_ES)) {
      expect(stage.label.length).toBeGreaterThan(0);
      expect(stage.whispers.length).toBeGreaterThan(0);
    }
  });

  it('keeps the two requested choice labels in both languages', () => {
    expect(localizeEnding(ENDINGS[0]!, 'en').choiceLabel).toBe('Release Memories');
    expect(localizeEnding(ENDINGS[0]!, 'es').choiceLabel).toBe('Liberar recuerdos');
    expect(localizeEnding(ENDINGS[1]!, 'en').choiceLabel).toBe('Stay in the Tape');
    expect(localizeEnding(ENDINGS[1]!, 'es').choiceLabel).toBe('Quedarse en la cinta');
  });
});

describe('localization', () => {
  it('returns English text unchanged and Spanish text on request', () => {
    const fragment = everything.fragments[0]!;
    expect(localizeFragment(fragment, 'en').text).toBe(fragment.text);
    expect(localizeFragment(fragment, 'es').text).toBe(FRAGMENT_COPY_ES[fragment.id]?.text);
  });

  it('describes every objective kind in both languages', () => {
    const objectives: NarrativeObjective[] = [
      { kind: 'secret-ending-ready' },
      { kind: 'choose-ending' },
      { kind: 'restore-archive' },
      { kind: 'find-tape', tapeId: FIRST_TAPE_ID },
      { kind: 'play-tape', tapeId: FIRST_TAPE_ID },
      { kind: 'play-game', tapeId: FIRST_TAPE_ID, gameName: 'SNAKE.EXE' },
      { kind: 'locked' },
    ];
    for (const objective of objectives) {
      expect(describeObjective(objective, 'en')).not.toBe(describeObjective(objective, 'es'));
    }
    expect(describeObjective({ kind: 'find-tape', tapeId: FIRST_TAPE_ID }, 'es')).toContain('Verano del 97');
  });

  it('keeps the English objective exposed by the evaluator', () => {
    const state = evaluateNarrativeState(createInitialState());
    expect(state.nextObjective).toBe(describeObjective(state.objective, 'en'));
  });

  it('localizes the club atmosphere', () => {
    const atmosphere = narrativeFor(finished);
    expect(localizeAtmosphere(atmosphere, 'en').headline).toBe(atmosphere.headline);
    const spanish = localizeAtmosphere(atmosphere, 'es');
    expect(spanish.headline).toBe(STAGE_COPY_ES['archive-open'].headline);
    expect(spanish.stageLabel).toBe('Archivo abierto');
    expect(spanish.nextObjective).toBe(describeObjective(atmosphere.objective, 'es'));
  });
});

describe('buildJournalModel', () => {
  it('builds English and Spanish journals from GameState v1', () => {
    const english = buildJournalModel(finished, {}, 'en');
    const spanish = buildJournalModel(finished, {}, 'es');
    expect(english.entries.map((entry) => entry.kind)).toEqual(['memory', 'clue', 'archive']);
    expect(spanish.entries.map((entry) => entry.id)).toEqual(english.entries.map((entry) => entry.id));
    expect(spanish.entries[0]!.text).not.toBe(english.entries[0]!.text);
    expect(english.totalEntries).toBe(8);
  });

  it('exposes localized endings, adding the secret ending only when earned', () => {
    expect(buildJournalModel(finished, {}, 'es').endings.map((ending) => ending.id)).toEqual(['bittersweet-dawn', 'forever-1998']);
    const extra = {
      minigameSecrets: ACTS.map((act) => act.secret.id),
      perfectTrackingArchive: true,
    };
    const secret = buildJournalModel(finished, extra, 'es').endings;
    expect(secret.map((ending) => ending.id)).toContain('archivists-truth');
    expect(secret.find((ending) => ending.id === 'archivists-truth')?.title).toBe('La verdad del Archivista');
  });

  it('returns an empty journal for a new game', () => {
    const model = buildJournalModel(createInitialState(), {}, 'en');
    expect(model.entries).toEqual([]);
    expect(model.endings).toEqual([]);
  });
});
