import { FIRST_CLUE_ID, FIRST_TAPE_ID, MEMORY_ID, SNAKE_GAME_ID } from '../../core/contracts';
import { TRANSPORT_FPS, type TapeDefinition } from '../restoration/types';

export const CLUB_NAME = 'Midnight Rentals';
export const SECOND_TAPE_ID = 'tape-002';
export const SECOND_CLUE_ID = 'mirror-stance';
export const SHADOW_FIGHT_GAME_ID = 'shadow-fight-001';
export const THIRD_TAPE_ID = 'tape-003';
export const THIRD_CLUE_ID = 'dead-channel';
export const DEAD_FREQUENCY_GAME_ID = 'dead-frequency-001';
export const PERFECT_TRACKING_CLUE_ID = 'perfect-tracking';

export type ActNumber = 1 | 2 | 3;
export type EndingId = 'bittersweet-dawn' | 'forever-1998' | 'archivists-truth';

export interface MinigameSecret {
  id: string;
  label: string;
}

export interface ActDefinition {
  act: ActNumber;
  tape: TapeDefinition;
  clueId: string;
  gameId: string;
  gameName: string;
  secret: MinigameSecret;
  memoryText: string;
  clueText: string;
}

export interface EndingDefinition {
  id: EndingId;
  title: string;
  choiceLabel: string;
  text: string;
}

const at = (seconds: number): number => Math.round(seconds * TRANSPORT_FPS);

export const ACTS: readonly ActDefinition[] = [
  {
    act: 1,
    tape: {
      id: FIRST_TAPE_ID,
      title: 'Summer \u201997 \u2014 High Score',
      duration: 84,
      idealTracking: 62,
      initialTracking: 50,
      clueWindows: [{ clueId: FIRST_CLUE_ID, startFrame: at(41), endFrame: at(43.5), trackingMin: 54, trackingMax: 70 }],
    },
    clueId: FIRST_CLUE_ID,
    gameId: SNAKE_GAME_ID,
    gameName: 'SNAKE.EXE',
    secret: { id: 'secret-snake-093198', label: 'Secret code 09-31-98' },
    memoryText:
      'Maya leans over the cabinet at Midnight Rentals, tongue between her teeth, chasing a high score while Leo narrates like a sports announcer. Sam keeps the tally on a rental receipt. Julian holds the camera and laughs so hard the picture shakes. It is the best afternoon of the summer.',
    clueText:
      'Halfway through the replay, every reflection in the shop turns toward the lens and becomes an eye. In the static, a code is scratched into the glass: 09-31-98. Steady the tracking and the CRT locks onto a frequency that was never meant to carry a picture. SNAKE.EXE answers.',
  },
  {
    act: 2,
    tape: {
      id: SECOND_TAPE_ID,
      title: 'Oct 30 \u2014 The Mirror Match',
      duration: 96,
      idealTracking: 38,
      initialTracking: 50,
      clueWindows: [{ clueId: SECOND_CLUE_ID, startFrame: at(61), endFrame: at(63.5), trackingMin: 30, trackingMax: 46 }],
    },
    clueId: SECOND_CLUE_ID,
    gameId: SHADOW_FIGHT_GAME_ID,
    gameName: 'SHADOW FIGHT',
    secret: { id: 'secret-shadow-self', label: 'The question: "Why are you fighting yourself?"' },
    memoryText:
      'The night before Halloween, Sam and Leo play a mirror match on the shop\u2019s fighting cabinet, wearing matching costumes. Maya keeps score on her arm in marker. Sam wins, spins around and takes a bow.',
    clueText:
      'On the paused frame, Sam\u2019s shadow keeps bowing. Its face has been smoothed away like wax. Under the hiss, a voice asks: "Why are you fighting yourself?" Lock the tracking and the shadow shows a stance nobody ever played. SHADOW FIGHT boots.',
  },
  {
    act: 3,
    tape: {
      id: THIRD_TAPE_ID,
      title: 'Oct 31, 23:58 \u2014 Last Broadcast',
      duration: 120,
      idealTracking: 81,
      initialTracking: 50,
      clueWindows: [{ clueId: THIRD_CLUE_ID, startFrame: at(117), endFrame: at(119), trackingMin: 74, trackingMax: 88 }],
    },
    clueId: THIRD_CLUE_ID,
    gameId: DEAD_FREQUENCY_GAME_ID,
    gameName: 'DEAD FREQUENCY',
    secret: { id: 'secret-dead-frequency', label: 'The face in the radio waves' },
    memoryText:
      'Two minutes before midnight on Halloween 1998. The party spills across the shop floor and Julian\u2019s radio is still tuned to the late show. Everyone counts down together, and for one minute nobody is afraid.',
    clueText:
      'On the paused frame, the radio waves bend into a face that is patient and familiar. The dead channel is not empty. It is waiting. DEAD FREQUENCY tunes in.',
  },
];

export const ARCHIVE_TAPE: TapeDefinition = {
  id: MEMORY_ID,
  title: 'Archive 09 \u2014 Master Reel',
  duration: 60,
  idealTracking: 100,
  initialTracking: 50,
  clueWindows: [{ clueId: PERFECT_TRACKING_CLUE_ID, startFrame: at(50), endFrame: at(55), trackingMin: 100, trackingMax: 100 }],
};

export const ARCHIVE_MEMORY_TEXT =
  'Archive 09 opens. Three voices ask the same question in the dark: do you let us go, or do you stay?';

export const ARCHIVE_TRUTH_TEXT =
  'Julian never made it out of 1998. Every tape in this archive was recorded by someone who could not bear to watch the ending. Leo has spent years rewinding the club and deleting the one frame that shows why. Leo is The Archivist.';

export const ENDINGS: readonly EndingDefinition[] = [
  {
    id: 'bittersweet-dawn',
    title: 'Bittersweet Dawn',
    choiceLabel: 'Release Memories',
    text: 'You let the tapes run out. Maya, Sam and Julian wave from the doorway as the CRT fades, and morning light cuts through Midnight Rentals. It hurts. It is also over.',
  },
  {
    id: 'forever-1998',
    title: 'Forever 1998',
    choiceLabel: 'Stay in the Tape',
    text: 'You press record. The countdown starts again and the party never ends. Somewhere outside the frame, the world forgets you were ever there.',
  },
  {
    id: 'archivists-truth',
    title: 'The Archivist\u2019s Truth',
    choiceLabel: 'Watch the Last Frame',
    text: 'The final frame holds still and the picture finally shows who has been holding the remote. Julian died in 1998. Leo became The Archivist to erase his guilt, one rewound minute at a time. This time the tape plays through to the end.',
  },
];

export const TAPES: readonly TapeDefinition[] = [...ACTS.map((entry) => entry.tape), ARCHIVE_TAPE];
