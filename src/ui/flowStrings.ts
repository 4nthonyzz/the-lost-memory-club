import { ACTS } from '../memories/fragments/memoryCatalog';
import { shelfTapeLabel } from '../memories/storyFlow';
import { ACT_LINKS, type MemberTitleKey, type SecretRequirement } from '../core/progression';
import type { Language } from './preferences';

export type ArcadeKind = 'snake' | 'shadow' | 'dead';

/** Copy for the screens added around the story flow: intro, shelf, cabinets, endings, member card and HUD. */
export interface FlowStrings {
  intro: {
    skip: string;
    rec: string;
    cast: string;
    sparks: string;
    thought: string;
    guide: string;
  };
  hud: {
    hint: string;
    endings: string;
    credential: string;
    power: string;
    reset: string;
    resetAsk: string;
    resetYes: string;
    resetNo: string;
  };
  shelf: {
    heading: string;
    intro: string;
    pickup: string;
    box: string;
    archive: string;
    replay: string;
    empty: string;
    keyHint: string;
    boxLabel: string;
    archiveLabel: string;
    polaroidCaptured: string;
    polaroidPending: string;
  };
  arcade: {
    heading: string;
    intro: string;
    play: string;
    simulate: string;
    back: string;
    done: string;
    ready: string;
    lockedBy: (act: number) => string;
    help: Record<ArcadeKind, string>;
    lore: Record<ArcadeKind, string>;
    label: Record<ArcadeKind, string>;
    signal: Record<ArcadeKind, string>;
    won: string;
    lost: string;
    round: (current: number, total: number) => string;
    misses: (count: number) => string;
    lockProgress: (percent: number) => string;
    apples: (eaten: number, goal: number) => string;
    dial: string;
    escape: string;
  };
  action: {
    insertTape: string;
    tapeLabel: (tapeId: string) => string;
    clueToArcade: (machine: string) => string;
    insertCoin: (machine: string) => string;
    skip: string;
  };
  memory: {
    lore: (machine: string) => string;
  };
  endings: {
    continue: string;
    lockedName: string;
    missingPrefix: string;
  };
  secret: {
    polaroids: (have: number, need: number) => string;
    box: string;
    arcade: (name: string) => string;
  };
  member: {
    time: string;
    polaroids: string;
    arcades: string;
    close: string;
    power: string;
    noTime: string;
    titles: Record<MemberTitleKey, string>;
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

const EN: FlowStrings = {
  intro: {
    skip: 'Skip [Space]',
    rec: 'REC \u25cf 1997',
    cast: 'MAYA \u00b7 LEO \u00b7 SAM \u00b7 JULIAN',
    sparks: '\u26a1',
    thought: 'Where am I?\u2026 Midnight Rentals? But this place closed ten years ago\u2026',
    guide: 'The television is waiting at the counter.',
  },
  hud: {
    hint: 'Enter captures the mouse, then WASD moves. E interacts.',
    endings: 'View endings',
    credential: 'Member card',
    power: '[ POWER \u23fb ]',
    reset: '\u21bb Reset',
    resetAsk: 'Delete this run and start over?',
    resetYes: 'Yes, reset',
    resetNo: 'Cancel',
  },
  shelf: {
    heading: 'VHS shelf',
    intro: 'Take a tape from the shelf, or play one you already hold.',
    pickup: 'Take and play',
    box: 'Take Julian and Maya\u2019s box',
    archive: 'Play Archive 09',
    replay: 'Watch again',
    empty: 'Nothing to play yet.',
    keyHint: 'Press E to take the first new item.',
    boxLabel: 'Julian and Maya\u2019s box',
    archiveLabel: 'Archive 09 \u00b7 Master Reel',
    polaroidCaptured: '\u2605 Polaroid captured',
    polaroidPending: '\u25cb Polaroid pending \u2014 press Space during the anomaly',
  },
  arcade: {
    heading: 'Arcade cabinets',
    intro: 'Win every cabinet to restore Archive 09.',
    play: 'Play',
    simulate: 'Quick win (demo)',
    back: 'Back to the cabinets',
    done: 'Completed',
    ready: 'Ready',
    lockedBy: (act) => `Locked: find the clue on tape ${pad(act)} first.`,
    help: {
      snake: 'Eat five apples. Arrows or WASD turn the snake. Walls and your own body end the run.',
      shadow: 'Repeat the shadow\u2019s stance with the arrows or WASD. A wrong key resets the round.',
      dead: 'Tune with \u2190 \u2192 or A D. Hold Space on the signal until it locks.',
    },
    lore: {
      snake: 'Julian remembers Maya turning every loss into another try. The cabinet wakes when the tape finds her high score.',
      shadow: 'LAST EXIT is corrupted, running SHADOW FIGHT. The reflection imitates you one move too late.',
      dead: 'Julian found a voice inside the dead channel. It repeats the date that should not exist.',
    },
    label: {
      snake: 'SNAKE.EXE',
      shadow: 'LAST EXIT / SHADOW FIGHT',
      dead: 'DEAD FREQUENCY',
    },
    signal: {
      snake: 'Signal detected in SNAKE.EXE',
      shadow: 'Anomaly in LAST EXIT / SHADOW FIGHT',
      dead: 'Frequency active in DEAD FREQUENCY',
    },
    won: 'Cabinet beaten.',
    lost: 'Run over. Press Enter to try again.',
    round: (current, total) => `Round ${current} of ${total}`,
    misses: (count) => `Misses: ${count}`,
    lockProgress: (percent) => `Lock ${percent}%`,
    apples: (eaten, goal) => `Apples: ${eaten} of ${goal}`,
    dial: 'Dial',
    escape: 'Esc returns to the cabinets.',
  },
  action: {
    insertTape: 'INSERTING TAPE',
    tapeLabel: (tapeId) => tapeId === 'archive-09' ? 'ARCHIVE 09' : `TAPE ${tapeId.slice(-1).padStart(2, '0')}`,
    clueToArcade: (machine) => `Signal detected in ${machine}`,
    insertCoin: (machine) => `INSERT COIN \u00b7 ${machine}`,
    skip: 'Skip animation',
  },
  memory: {
    lore: (machine) => machine.includes('SNAKE')
      ? `Julian found Maya\u2019s high score still breathing inside ${machine}.`
      : machine.includes('SHADOW')
        ? `Julian found Sam\u2019s reflection moving after the screen stopped.`
        : `Julian found the dead channel repeating 31-09-98 through ${machine}.`,
  },
  endings: {
    continue: 'Continue to the member card',
    lockedName: '\ud83d\udd12 The Memory That Lives',
    missingPrefix: 'Missing: ',
  },
  secret: {
    polaroids: (have, need) => `${need} anomalous Polaroids (${have}/${need})`,
    box: 'Julian and Maya\u2019s box',
    arcade: (name) => `Cabinet: ${name}`,
  },
  member: {
    time: 'Time',
    polaroids: 'Polaroids',
    arcades: 'Cabinets',
    close: 'Close card',
    power: '[ POWER \u23fb ]',
    noTime: '--:--',
    titles: {
      'first-friday': 'The First Friday',
      'eye-of-the-lens': 'Eye of the Lens',
      'september-guardian': 'Guardian of September 31st',
      'relentless-archivist': 'Relentless Archivist',
    },
  },
};

const ES: FlowStrings = {
  intro: {
    skip: 'Saltar [Espacio]',
    rec: 'REC \u25cf 1997',
    cast: 'MAYA \u00b7 LEO \u00b7 SAM \u00b7 JULIAN',
    sparks: '\u26a1',
    thought: '\u00bfD\u00f3nde estoy?\u2026 \u00bfMidnight Rentals? Pero este lugar cerr\u00f3 hace diez a\u00f1os\u2026',
    guide: 'El televisor te espera en el mostrador.',
  },
  hud: {
    hint: 'Enter captura el rat\u00f3n; despu\u00e9s WASD mueve. E interact\u00faa.',
    endings: 'Ver finales',
    credential: 'Credencial de socio',
    power: '[ POWER \u23fb ]',
    reset: '\u21bb Reiniciar',
    resetAsk: '\u00bfBorrar esta partida y empezar de nuevo?',
    resetYes: 'S\u00ed, reiniciar',
    resetNo: 'Cancelar',
  },
  shelf: {
    heading: 'Estante de VHS',
    intro: 'Recoge una cinta del estante o reproduce una que ya tengas.',
    pickup: 'Recoger y reproducir',
    box: 'Recoger la caja de Julian y Maya',
    archive: 'Reproducir Archivo 09',
    replay: 'Volver a ver',
    empty: 'Nada que reproducir todav\u00eda.',
    keyHint: 'Pulsa E para tomar el primer elemento nuevo.',
    boxLabel: 'Caja de Julian y Maya',
    archiveLabel: 'Archivo 09 \u00b7 Cinta maestra',
    polaroidCaptured: '\u2605 Polaroid capturada',
    polaroidPending: '\u25cb Polaroid pendiente \u2014 pulsa Espacio en la anomal\u00eda',
  },
  arcade: {
    heading: 'Recreativas',
    intro: 'Gana cada recreativa para restaurar el Archivo 09.',
    play: 'Jugar',
    simulate: 'Victoria r\u00e1pida (demo)',
    back: 'Volver a las recreativas',
    done: 'Completada',
    ready: 'Disponible',
    lockedBy: (act) => `Bloqueada: encuentra antes la pista de la cinta ${pad(act)}.`,
    help: {
      snake: 'Come cinco manzanas. Las flechas o WASD giran la serpiente. Las paredes y tu propio cuerpo terminan la partida.',
      shadow: 'Repite la postura de la sombra con las flechas o WASD. Una tecla err\u00f3nea reinicia la ronda.',
      dead: 'Sintoniza con \u2190 \u2192 o con A D. Mant\u00e9n Espacio sobre la se\u00f1al hasta que enganche.',
    },
    lore: {
      snake: 'Julian recuerda a Maya convirtiendo cada derrota en otro intento. La cabina despierta al encontrar su r\u00e9cord.',
      shadow: 'LAST EXIT est\u00e1 corrupta y ejecuta SHADOW FIGHT. El reflejo te imita con un movimiento de retraso.',
      dead: 'Julian encontr\u00f3 una voz dentro del canal muerto. Repite la fecha que no deber\u00eda existir.',
    },
    label: {
      snake: 'SNAKE.EXE',
      shadow: 'LAST EXIT / SHADOW FIGHT',
      dead: 'DEAD FREQUENCY',
    },
    signal: {
      snake: 'Se\u00f1al detectada en SNAKE.EXE',
      shadow: 'Anomal\u00eda en LAST EXIT / SHADOW FIGHT',
      dead: 'Frecuencia activa en DEAD FREQUENCY',
    },
    won: 'Recreativa superada.',
    lost: 'Partida terminada. Pulsa Enter para intentarlo otra vez.',
    round: (current, total) => `Ronda ${current} de ${total}`,
    misses: (count) => `Fallos: ${count}`,
    lockProgress: (percent) => `Enganche ${percent}%`,
    apples: (eaten, goal) => `Manzanas: ${eaten} de ${goal}`,
    dial: 'Sinton\u00eda',
    escape: 'Esc vuelve a las recreativas.',
  },
  action: {
    insertTape: 'INSERTANDO CINTA',
    tapeLabel: (tapeId) => tapeId === 'archive-09' ? 'ARCHIVO 09' : `CINTA ${tapeId.slice(-1).padStart(2, '0')}`,
    clueToArcade: (machine) => `Se\u00f1al detectada en ${machine}`,
    insertCoin: (machine) => `INSERTA FICHA \u00b7 ${machine}`,
    skip: 'Saltar animaci\u00f3n',
  },
  memory: {
    lore: (machine) => machine.includes('SNAKE')
      ? `Julian descubri\u00f3 que el r\u00e9cord de Maya segu\u00eda latiendo dentro de ${machine}.`
      : machine.includes('SHADOW')
        ? 'Julian descubri\u00f3 que el reflejo de Sam se mov\u00eda cuando la pantalla ya estaba quieta.'
        : `Julian descubri\u00f3 que el canal muerto repet\u00eda 31-09-98 a trav\u00e9s de ${machine}.`,
  },
  endings: {
    continue: 'Continuar a la credencial',
    lockedName: '\ud83d\udd12 El recuerdo que vive',
    missingPrefix: 'Faltan: ',
  },
  secret: {
    polaroids: (have, need) => `${need} Polaroids an\u00f3malas (${have}/${need})`,
    box: 'Caja de Julian y Maya',
    arcade: (name) => `Recreativa: ${name}`,
  },
  member: {
    time: 'Tiempo',
    polaroids: 'Polaroids',
    arcades: 'Recreativas',
    close: 'Cerrar credencial',
    power: '[ POWER \u23fb ]',
    noTime: '--:--',
    titles: {
      'first-friday': 'El Primer Viernes',
      'eye-of-the-lens': 'Ojo de C\u00e1mara',
      'september-guardian': 'Guardi\u00e1n del 31 de Septiembre',
      'relentless-archivist': 'Archivista Implacable',
    },
  },
};

export function getFlowStrings(language: Language): FlowStrings {
  return language === 'es' ? ES : EN;
}

function gameName(gameId: string): string {
  return ACTS.find((act) => act.gameId === gameId)?.gameName ?? gameId;
}

export function arcadeKindForGame(gameId: string): ArcadeKind {
  const act = ACT_LINKS.find((link) => link.gameId === gameId)?.act;
  return act === 1 ? 'snake' : act === 2 ? 'shadow' : 'dead';
}

export function cabinetLabel(gameId: string, language: Language): string {
  const strings = getFlowStrings(language).arcade;
  return strings.label[arcadeKindForGame(gameId)];
}

export function arcadeAwakenedNotice(gameId: string, language: Language): string {
  const machine = cabinetLabel(gameId, language);
  return language === 'es'
    ? `La cabina ${machine} acaba de encenderse sola.`
    : `The ${machine} cabinet has just switched on by itself.`;
}

/** Readable text for one missing requirement of the secret ending. Never shows raw ids. */
export function formatSecretRequirement(requirement: SecretRequirement, language: Language): string {
  const strings = getFlowStrings(language).secret;
  switch (requirement.kind) {
    case 'tape':
      return shelfTapeLabel(requirement.tapeId, language);
    case 'arcade':
      return strings.arcade(cabinetLabel(requirement.gameId, language));
    case 'box':
      return strings.box;
    case 'polaroids':
      return strings.polaroids(requirement.have, requirement.need);
  }
}

/** Cabinet name for the quick win, memory card and world toast. */
export function cabinetName(gameId: string): string {
  return ACT_LINKS.some((link) => link.gameId === gameId) ? gameName(gameId) : gameId;
}
