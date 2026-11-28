import { MEMORY_ID, type GameState } from '../../core/contracts';
import { isSecretEndingEligible } from '../../core/progression';
import {
  ACTS,
  ARCHIVE_MEMORY_TEXT,
  ARCHIVE_TRUTH_TEXT,
  type ActDefinition,
  type ActNumber,
  type EndingId,
} from './memoryCatalog';
import { describeObjective, type NarrativeObjective } from './narrativeText';

export interface ExtraProgress {
  collectedTapes?: readonly string[];
  discoveredClues?: readonly string[];
  completedGames?: readonly string[];
  minigameSecrets?: readonly string[];
  perfectTrackingArchive?: boolean;
}

export type ActStatus = 'locked' | 'available' | 'tape-collected' | 'clue-found' | 'completed';

export interface ActProgress {
  act: ActNumber;
  tapeId: string;
  title: string;
  gameName: string;
  status: ActStatus;
}

export interface JournalFragment {
  id: string;
  title: string;
  text: string;
}

export interface SecretProgress {
  found: number;
  total: number;
  perfectTracking: boolean;
  eligible: boolean;
}

export interface NarrativeState {
  acts: readonly ActProgress[];
  fragments: readonly JournalFragment[];
  totalFragments: number;
  archiveRestored: boolean;
  unlockedEndings: readonly EndingId[];
  secrets: SecretProgress;
  objective: NarrativeObjective;
  nextObjective: string;
}

export type ClubStage = 'dormant' | 'stirring' | 'watching' | 'shifted' | 'archive-open';

export interface ClubAtmosphere {
  stage: ClubStage;
  distortion: number;
  headline: string;
  whispers: readonly string[];
  objective: NarrativeObjective;
  nextObjective: string;
}

const STAGE_COPY: Record<ClubStage, { headline: string; whispers: readonly string[] }> = {
  dormant: {
    headline: 'The club is quiet. The tapes are waiting.',
    whispers: ['The neon sign hums a note too low to hear.', 'Something on the shelf is labeled in your handwriting.'],
  },
  stirring: {
    headline: 'The shelves have rearranged themselves.',
    whispers: ['Someone rewound a tape while you were not looking.', 'The CRT is warm, and it is switched off.'],
  },
  watching: {
    headline: 'Every screen in the club is watching you.',
    whispers: ['The posters have turned to face the door.', 'You hear laughter that was recorded in 1997.'],
  },
  shifted: {
    headline: 'The club remembers more than you do.',
    whispers: ['The floor plan does not match the one in your head.', 'A fourth set of footprints leads into the aisle.'],
  },
  'archive-open': {
    headline: 'Archive 09 is open. The club is listening.',
    whispers: ['The front door is gone. Light is coming from somewhere.', 'Three voices are waiting for you to choose.'],
  },
};

function union(...lists: ReadonlyArray<readonly string[] | undefined>): ReadonlySet<string> {
  return new Set(lists.flatMap((list) => list ?? []));
}

function actStatus(
  act: ActDefinition,
  previousCompleted: boolean,
  tapes: ReadonlySet<string>,
  clues: ReadonlySet<string>,
  games: ReadonlySet<string>,
): ActStatus {
  if (!previousCompleted) return 'locked';
  if (games.has(act.gameId)) return 'completed';
  if (clues.has(act.clueId)) return 'clue-found';
  if (tapes.has(act.tape.id)) return 'tape-collected';
  return 'available';
}

function objectiveFor(acts: readonly ActProgress[], archiveRestored: boolean, secretEligible: boolean): NarrativeObjective {
  if (secretEligible) return { kind: 'secret-ending-ready' };
  if (archiveRestored) return { kind: 'choose-ending' };
  const current = acts.find((entry) => entry.status !== 'completed');
  if (!current) return { kind: 'restore-archive' };
  switch (current.status) {
    case 'available':
      return { kind: 'find-tape', tapeId: current.tapeId };
    case 'tape-collected':
      return { kind: 'play-tape', tapeId: current.tapeId };
    case 'clue-found':
      return { kind: 'play-game', tapeId: current.tapeId, gameName: current.gameName };
    default:
      return { kind: 'locked' };
  }
}

export function evaluateNarrativeState(gameState: GameState, extraProgress: ExtraProgress = {}): NarrativeState {
  const tapes = union(gameState.collectedTapes, extraProgress.collectedTapes);
  const clues = union(gameState.discoveredClues, extraProgress.discoveredClues);
  const games = union(gameState.completedArcades, extraProgress.completedGames);
  const secretIds = union(extraProgress.minigameSecrets);

  const acts: ActProgress[] = [];
  let previousCompleted = true;
  for (const definition of ACTS) {
    const status = actStatus(definition, previousCompleted, tapes, clues, games);
    acts.push({ act: definition.act, tapeId: definition.tape.id, title: definition.tape.title, gameName: definition.gameName, status });
    previousCompleted = status === 'completed';
  }

  const fragments: JournalFragment[] = [];
  for (const definition of ACTS) {
    const progress = acts.find((entry) => entry.act === definition.act);
    if (!progress || progress.status === 'locked' || progress.status === 'available') continue;
    fragments.push({ id: `${definition.tape.id}:memory`, title: definition.tape.title, text: definition.memoryText });
    if (progress.status !== 'tape-collected') {
      fragments.push({ id: `${definition.tape.id}:clue`, title: `${definition.gameName} signal`, text: definition.clueText });
    }
  }

  const archiveRestored = gameState.restoredMemories.includes(MEMORY_ID);
  const secretsFound = ACTS.filter((definition) => secretIds.has(definition.secret.id)).length;
  const perfectTracking = extraProgress.perfectTrackingArchive === true;
  // The secret ending follows the story gates in core: all tapes, cabinets, the box and three Polaroids.
  const eligible = isSecretEndingEligible(gameState);

  if (archiveRestored) fragments.push({ id: `${MEMORY_ID}:memory`, title: 'Archive 09', text: ARCHIVE_MEMORY_TEXT });
  if (eligible) fragments.push({ id: `${MEMORY_ID}:truth`, title: 'The Archivist', text: ARCHIVE_TRUTH_TEXT });

  const unlockedEndings: EndingId[] = archiveRestored ? ['bittersweet-dawn', 'forever-1998'] : [];
  if (eligible) unlockedEndings.push('archivists-truth');

  const objective = objectiveFor(acts, archiveRestored, eligible);
  return {
    acts,
    fragments,
    totalFragments: ACTS.length * 2 + 2,
    archiveRestored,
    unlockedEndings,
    secrets: { found: secretsFound, total: ACTS.length, perfectTracking, eligible },
    objective,
    nextObjective: describeObjective(objective, 'en'),
  };
}

function stageFor(narrative: NarrativeState): ClubStage {
  if (narrative.archiveRestored) return 'archive-open';
  const statuses = narrative.acts.map((entry) => entry.status);
  if (statuses.includes('completed')) return 'shifted';
  if (statuses.includes('clue-found')) return 'watching';
  if (statuses.includes('tape-collected')) return 'stirring';
  return 'dormant';
}

const STATUS_POINTS: Record<ActStatus, number> = {
  locked: 0,
  available: 0,
  'tape-collected': 1,
  'clue-found': 2,
  completed: 3,
};

export function narrativeFor(gameState: GameState): ClubAtmosphere {
  const narrative = evaluateNarrativeState(gameState);
  const stage = stageFor(narrative);
  const points = narrative.acts.reduce((total, entry) => total + STATUS_POINTS[entry.status], 0) + (narrative.archiveRestored ? 1 : 0);
  const maxPoints = ACTS.length * 3 + 1;
  return {
    stage,
    distortion: Math.round((points / maxPoints) * 100) / 100,
    headline: STAGE_COPY[stage].headline,
    whispers: STAGE_COPY[stage].whispers,
    objective: narrative.objective,
    nextObjective: narrative.nextObjective,
  };
}
