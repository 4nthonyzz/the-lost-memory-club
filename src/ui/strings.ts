import type { Language } from './preferences';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type JournalEntryKind = 'memory' | 'clue' | 'archive' | 'truth';

export interface ShellStrings {
  eyebrow: string;
  title: string;
  subheading: string;
  buildPill: string;
  sceneHeading: string;
  renderOnline: string;
  footer: string;
  notices: {
    intro: string;
    crtConnected: string;
    arcadeConnected: string;
    arcadeLocked: string;
    arcadeLogged: string;
    demoArcadeWon: string;
    tapeCollected: string;
    clueConfirmed: string;
    needTape: string;
    archiveLoaded: string;
    endingLocked: string;
    boxCollected: string;
    reset: string;
    calendarShifted: string;
    arcadeAwakened: string;
    polaroidDeveloped: string;
  };
  progress: {
    eyebrow: string;
    heading: string;
    tape: string;
    clue: string;
    arcade: string;
    ending: string;
    yes: string;
    no: string;
    reset: string;
    openEnding: string;
  };
  deck: {
    eyebrow: string;
    title: string;
    collect: string;
    inspect: string;
    load: string;
    loaded: string;
    archiveLocked: string;
    archiveOpen: string;
    emptyDeck: string;
    close: string;
  };
  next: {
    eyebrow: string;
    text: string;
  };
}

export type ShellNotice = keyof ShellStrings['notices'];

export interface UiStrings {
  journal: {
    title: string;
    subtitle: string;
    empty: string;
    undeveloped: string;
    progress: (found: number, total: number) => string;
    atmosphereHeading: string;
    objectiveLabel: string;
    corruptionLabel: string;
    close: string;
    kinds: Record<JournalEntryKind, string>;
  };
  endings: {
    heading: string;
    intro: string;
    unavailable: string;
    newBadge: string;
    secretUnlocked: string;
    restart: string;
    archiveReady: string;
    frozenStamp: string;
    dawnStamp: string;
  };
  save: Record<SaveStatus, string>;
  settings: {
    title: string;
    language: string;
    english: string;
    spanish: string;
    reducedDistortion: string;
    reducedDistortionHint: string;
    mute: string;
  };
  shell: ShellStrings;
}

const EN: UiStrings = {
  journal: {
    title: 'Memory Journal',
    subtitle: 'Midnight Rentals \u00b7 1996\u20131998',
    empty: 'No memories developed yet. Find a tape and watch it closely.',
    undeveloped: 'Undeveloped',
    progress: (found, total) => `${found} of ${total} fragments recovered`,
    atmosphereHeading: 'The Living Club',
    objectiveLabel: 'Next',
    corruptionLabel: 'Corruption',
    close: 'Close journal',
    kinds: { memory: 'Memory', clue: 'Clue', archive: 'Archive', truth: 'Truth' },
  },
  endings: {
    heading: 'Choose how the club ends',
    intro: 'Archive 09 is open. Three voices are waiting.',
    unavailable: 'Restore Archive 09 to reach the ending.',
    newBadge: 'NEW',
    secretUnlocked: 'A hidden tape has surfaced.',
    restart: 'Return to the archive',
    archiveReady: 'ARCHIVE-10: MAYA',
    frozenStamp: '23:58', dawnStamp: '01 NOV 1998',
  },
  save: {
    idle: 'Not saved yet',
    saving: 'Saving\u2026',
    saved: 'Saved',
    error: 'Save failed. Progress stays in memory.',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    english: 'English',
    spanish: 'Espa\u00f1ol',
    reducedDistortion: 'Reduced distortion',
    reducedDistortionHint: 'Turns off flashing, shaking and sudden glitches.',
    mute: 'Mute audio',
  },
  shell: {
    eyebrow: 'ARCHIVE 09 / EST. 1996',
    title: 'THE LOST MEMORY CLUB',
    subheading: 'Some memories should stay forgotten.',
    buildPill: 'PROTOTYPE BUILD \u00b7 NOT THE FINAL GAME',
    sceneHeading: 'ARCHIVE FLOOR \u00b7 PROTOTYPE',
    renderOnline: 'RENDER ONLINE',
    footer: 'KIROWEEN 2026 \u00b7 ORIGINAL PROTOTYPE \u00b7 NO THIRD-PARTY ASSETS INCLUDED',
    notices: {
      intro: 'Click the CRT television to open the VHS deck.',
      crtConnected: 'CRT STATION CONNECTED',
      arcadeConnected: 'ARCADE STATION CONNECTED',
      arcadeLocked: 'ARCADE LOCKED \u00b7 Recover the VHS clue first.',
      arcadeLogged: 'Arcade initialization event logged. Gameplay is pending.',
      demoArcadeWon: 'Demo: arcade victory recorded.',
      tapeCollected: 'Tape collected. Load it in the deck and play it.',
      clueConfirmed: 'CLUE CONFIRMED \u00b7 The arcade is now unlocked.',
      needTape: 'The VCR is empty. Find a tape first.',
      archiveLoaded: 'Archive 09 restored. Its tape is now in the deck.',
      endingLocked: 'Restore Archive 09 before opening the ending.',
      boxCollected: 'Julian and Maya\u2019s box is in your hands. Keep it safe.',
      reset: 'Development save reset.',
      calendarShifted: 'The wall clock has stopped at 31-09-98.',
      arcadeAwakened: 'SNAKE.EXE has just switched on by itself.',
      polaroidDeveloped: 'The Polaroid develops. Something is watching from the frame.',
    },
    progress: {
      eyebrow: 'FIELD NOTES',
      heading: 'Prototype Progress',
      tape: 'VHS collected',
      clue: 'Clue discovered',
      arcade: 'Arcade completed',
      ending: 'Ending unlocked',
      yes: 'YES',
      no: 'NO',
      reset: 'Reset local prototype state',
      openEnding: 'Open the ending',
    },
    deck: {
      eyebrow: 'ARCHIVE / MODULE 03',
      title: 'VHS deck',
      collect: 'Collect prototype tape',
      inspect: 'Inspect label clue',
      load: 'Load tape',
      loaded: 'Loaded',
      archiveLocked: 'Locked: win the arcade to restore Archive 09.',
      archiveOpen: 'Load Archive 09',
      emptyDeck: 'Load a tape to start playback.',
      close: 'Close',
    },
    next: {
      eyebrow: 'WHAT COMES NEXT?',
      text: 'Open the CRT to find the first tape. Pause on the strange frame and tune the tracking to uncover the clue that unlocks the arcade.',
    },
  },
};

const ES: UiStrings = {
  journal: {
    title: 'Diario de recuerdos',
    subtitle: 'Midnight Rentals \u00b7 1996\u20131998',
    empty: 'A\u00fan no se ha revelado ning\u00fan recuerdo. Busca una cinta y obs\u00e9rvala con atenci\u00f3n.',
    undeveloped: 'Sin revelar',
    progress: (found, total) => `${found} de ${total} fragmentos recuperados`,
    atmosphereHeading: 'El Club Viviente',
    objectiveLabel: 'Siguiente',
    corruptionLabel: 'Corrupci\u00f3n',
    close: 'Cerrar diario',
    kinds: { memory: 'Recuerdo', clue: 'Pista', archive: 'Archivo', truth: 'Verdad' },
  },
  endings: {
    heading: 'Elige c\u00f3mo termina el club',
    intro: 'El Archivo 09 est\u00e1 abierto. Tres voces esperan.',
    unavailable: 'Restaura el Archivo 09 para llegar al final.',
    newBadge: 'NUEVO',
    secretUnlocked: 'Ha surgido una cinta oculta.',
    restart: 'Volver al archivo',
    archiveReady: 'ARCHIVO-10: MAYA',
    frozenStamp: '23:58', dawnStamp: '01 NOV 1998',
  },
  save: {
    idle: 'A\u00fan sin guardar',
    saving: 'Guardando\u2026',
    saved: 'Guardado',
    error: 'Error al guardar. El progreso queda en memoria.',
  },
  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    english: 'English',
    spanish: 'Espa\u00f1ol',
    reducedDistortion: 'Distorsi\u00f3n reducida',
    reducedDistortionHint: 'Desactiva destellos, temblores y fallos bruscos.',
    mute: 'Silenciar audio',
  },
  shell: {
    eyebrow: 'ARCHIVO 09 / EST. 1996',
    title: 'EL CLUB DE LA MEMORIA PERDIDA',
    subheading: 'Algunos recuerdos deber\u00edan quedar olvidados.',
    buildPill: 'VERSI\u00d3N PROTOTIPO \u00b7 NO ES EL JUEGO FINAL',
    sceneHeading: 'SUELO DEL ARCHIVO \u00b7 PROTOTIPO',
    renderOnline: 'RENDER ACTIVO',
    footer: 'KIROWEEN 2026 \u00b7 PROTOTIPO ORIGINAL \u00b7 SIN ASSETS DE TERCEROS',
    notices: {
      intro: 'Haz clic en la televisi\u00f3n CRT para abrir la platina VHS.',
      crtConnected: 'ESTACI\u00d3N CRT CONECTADA',
      arcadeConnected: 'ESTACI\u00d3N RECREATIVA CONECTADA',
      arcadeLocked: 'RECREATIVA BLOQUEADA \u00b7 Recupera antes la pista VHS.',
      arcadeLogged: 'Inicio de la recreativa registrado. El juego a\u00fan est\u00e1 en desarrollo.',
      demoArcadeWon: 'Demo: victoria en la recreativa registrada.',
      tapeCollected: 'Cinta recogida. C\u00e1rgala en la platina y rep\u00f3drala.',
      clueConfirmed: 'PISTA CONFIRMADA \u00b7 La recreativa est\u00e1 desbloqueada.',
      needTape: 'La videograbadora est\u00e1 vac\u00eda. Primero encuentra una cinta.',
      archiveLoaded: 'Archivo 09 restaurado. Su cinta ya est\u00e1 en la platina.',
      endingLocked: 'Restaura el Archivo 09 antes de abrir el final.',
      boxCollected: 'La caja de Julian y Maya ya est\u00e1 en tus manos. G\u00e1rdala.',
      reset: 'Guardado de desarrollo reiniciado.',
      calendarShifted: 'El reloj de la pared acaba de detenerse en 31-09-98.',
      arcadeAwakened: 'La cabina SNAKE.EXE acaba de encenderse sola.',
      polaroidDeveloped: 'La Polaroid se revela. Algo observa desde el encuadre.',
    },
    progress: {
      eyebrow: 'NOTAS DE CAMPO',
      heading: 'Progreso del prototipo',
      tape: 'VHS recogido',
      clue: 'Pista descubierta',
      arcade: 'Recreativa completada',
      ending: 'Final desbloqueado',
      yes: 'S\u00cd',
      no: 'NO',
      reset: 'Reiniciar estado local del prototipo',
      openEnding: 'Abrir el final',
    },
    deck: {
      eyebrow: 'ARCHIVO / M\u00d3DULO 03',
      title: 'Platina VHS',
      collect: 'Recoger cinta',
      inspect: 'Inspeccionar pista de la etiqueta',
      load: 'Cargar cinta',
      loaded: 'Cargada',
      archiveLocked: 'Bloqueado: gana la recreativa para restaurar el Archivo 09.',
      archiveOpen: 'Cargar Archivo 09',
      emptyDeck: 'Carga una cinta para empezar la reproducci\u00f3n.',
      close: 'Cerrar',
    },
    next: {
      eyebrow: '\u00bfQU\u00c9 SIGUE?',
      text: 'Abre la CRT para encontrar la primera cinta. Pausa en el fotograma extra\u00f1o y ajusta el tracking para descubrir la pista que desbloquea la recreativa.',
    },
  },
};

export function getUiStrings(language: Language): UiStrings {
  return language === 'es' ? ES : EN;
}
