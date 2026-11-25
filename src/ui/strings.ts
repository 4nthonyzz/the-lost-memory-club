import type { Language } from './preferences';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type JournalEntryKind = 'memory' | 'clue' | 'archive' | 'truth';

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
    archiveReady: 'ARCHIVE-10 READY',
    frozenStamp: 'OCT 31 1998 23:58',
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
    archiveReady: 'ARCHIVO-10 LISTO',
    frozenStamp: 'OCT 31 1998 23:58',
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
};

export function getUiStrings(language: Language): UiStrings {
  return language === 'es' ? ES : EN;
}
