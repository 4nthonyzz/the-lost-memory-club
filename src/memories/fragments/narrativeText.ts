import type { Language } from '../i18n';
import { ACTS, ARCHIVE_TAPE, ENDINGS, type EndingDefinition, type EndingId } from './memoryCatalog';
import type { ClubAtmosphere, ClubStage, JournalFragment } from './narrativeEvaluator';

export type NarrativeObjective =
  | { kind: 'secret-ending-ready' }
  | { kind: 'choose-ending' }
  | { kind: 'restore-archive' }
  | { kind: 'find-tape'; tapeId: string }
  | { kind: 'play-tape'; tapeId: string }
  | { kind: 'play-game'; tapeId: string; gameName: string }
  | { kind: 'locked' };

export interface LocalizedFragment {
  id: string;
  title: string;
  text: string;
  caption: string;
}

export interface LocalizedEnding {
  id: EndingId;
  title: string;
  choiceLabel: string;
  text: string;
}

export interface LocalizedAtmosphere {
  stage: ClubStage;
  stageLabel: string;
  distortion: number;
  headline: string;
  whispers: readonly string[];
  nextObjective: string;
}

interface CopyPair {
  title: string;
  text: string;
}

export const TAPE_TITLES_ES: Readonly<Record<string, string>> = {
  'tape-001': 'Verano del 97 \u2014 R\u00e9cord',
  'tape-002': 'Oct 30 \u2014 El combate espejo',
  'tape-003': 'Oct 31, 23:58 \u2014 \u00daltima transmisi\u00f3n',
  'archive-09': 'Archivo 09 \u2014 Cinta maestra',
};

export const FRAGMENT_COPY_ES: Readonly<Record<string, CopyPair>> = {
  'tape-001:memory': {
    title: TAPE_TITLES_ES['tape-001'] ?? '',
    text: 'Maya se inclina sobre la m\u00e1quina en Midnight Rentals, con la lengua entre los dientes, persiguiendo el r\u00e9cord mientras Leo narra como un locutor deportivo. Sam lleva la cuenta en un recibo de alquiler. Julian sostiene la c\u00e1mara y se r\u00ede tanto que la imagen tiembla. Es la mejor tarde del verano.',
  },
  'tape-001:clue': {
    title: 'Se\u00f1al de SNAKE.EXE',
    text: 'A mitad de la repetici\u00f3n, cada reflejo de la tienda se vuelve hacia la lente y se convierte en un ojo. Entre la est\u00e1tica, alguien raya un c\u00f3digo en el cristal: 09-31-98. Estabiliza el tracking y el CRT se sintoniza a una frecuencia que nunca debi\u00f3 transportar una imagen. SNAKE.EXE responde.',
  },
  'tape-002:memory': {
    title: TAPE_TITLES_ES['tape-002'] ?? '',
    text: 'La noche antes de Halloween, Sam y Leo juegan un combate espejo en la m\u00e1quina de lucha de la tienda, con disfraces iguales. Maya anota los puntos en su brazo con rotulador. Sam gana, da una vuelta y hace una reverencia.',
  },
  'tape-002:clue': {
    title: 'Se\u00f1al de SHADOW FIGHT',
    text: 'En el fotograma pausado, la sombra de Sam sigue haciendo reverencias. Su rostro ha sido borrado como cera lisa. Bajo el siseo, una voz pregunta: "\u00bfPor qu\u00e9 luchas contra ti mismo?" Fija el tracking y la sombra muestra una postura que nadie jug\u00f3 jam\u00e1s. SHADOW FIGHT arranca.',
  },
  'tape-003:memory': {
    title: TAPE_TITLES_ES['tape-003'] ?? '',
    text: 'Dos minutos antes de medianoche en Halloween de 1998. La fiesta se desborda por la tienda y la radio de Julian sigue sintonizada en el programa de la noche. Todos cuentan atr\u00e1s juntos, y durante un minuto nadie tiene miedo.',
  },
  'tape-003:clue': {
    title: 'Se\u00f1al de DEAD FREQUENCY',
    text: 'En el fotograma pausado, las ondas de la radio se doblan hasta formar un rostro paciente y familiar. El canal muerto no est\u00e1 vac\u00edo. Est\u00e1 esperando. DEAD FREQUENCY se sintoniza.',
  },
  'archive-09:memory': {
    title: 'Archivo 09',
    text: 'El Archivo 09 se abre. Tres voces hacen la misma pregunta en la oscuridad: \u00bfnos dejas ir, o te quedas?',
  },
  'archive-09:truth': {
    title: 'El Archivista',
    text: 'Julian nunca sali\u00f3 de 1998. Cada cinta de este archivo la grab\u00f3 alguien que no soportaba ver el final. Leo ha pasado a\u00f1os rebobinando el club y borrando el \u00fanico fotograma que muestra por qu\u00e9. Leo es El Archivista.',
  },
};

export const FRAGMENT_CAPTIONS: Readonly<Record<string, Record<Language, string>>> = {
  'tape-001:memory': { en: 'SUMMER 1997', es: 'VERANO 1997' },
  'tape-001:clue': { en: 'SNAKE.EXE', es: 'SNAKE.EXE' },
  'tape-002:memory': { en: 'OCT 30 1998', es: '30 OCT 1998' },
  'tape-002:clue': { en: 'SHADOW FIGHT', es: 'SHADOW FIGHT' },
  'tape-003:memory': { en: 'OCT 31 1998 \u00b7 23:58', es: '31 OCT 1998 \u00b7 23:58' },
  'tape-003:clue': { en: 'DEAD FREQUENCY', es: 'DEAD FREQUENCY' },
  'archive-09:memory': { en: 'ARCHIVE 09', es: 'ARCHIVO 09' },
  'archive-09:truth': { en: 'THE ARCHIVIST', es: 'EL ARCHIVISTA' },
};

export const ENDINGS_ES: Readonly<Record<EndingId, Omit<LocalizedEnding, 'id'>>> = {
  'bittersweet-dawn': {
    title: 'El primer viernes',
    choiceLabel: 'Liberar recuerdos',
    text: 'Dejas que las cintas se acaben. Maya, Sam y Julian se despiden desde la puerta mientras el CRT se apaga y la luz de la ma\u00f1ana atraviesa Midnight Rentals. Duele. Tambi\u00e9n ha terminado.',
  },
  'forever-1998': {
    title: 'Para siempre 1998',
    choiceLabel: 'Quedarse en la cinta',
    text: 'Pulsas grabar. La cuenta atr\u00e1s empieza otra vez y la fiesta no termina nunca. En alg\u00fan lugar fuera del encuadre, el mundo olvida que alguna vez estuviste all\u00ed.',
  },
  'archivists-truth': {
    title: 'El recuerdo que vive',
    choiceLabel: 'Ver el \u00faltimo fotograma',
    text: 'El fotograma final se queda quieto y la imagen por fin muestra qui\u00e9n ha tenido el mando todo este tiempo. Julian muri\u00f3 en 1998. Leo se convirti\u00f3 en El Archivista para borrar su culpa, un minuto rebobinado a la vez. Esta vez la cinta se reproduce hasta el final.',
  },
};

export const STAGE_COPY_ES: Readonly<Record<ClubStage, { label: string; headline: string; whispers: readonly string[] }>> = {
  dormant: {
    label: 'Dormido',
    headline: 'El club est\u00e1 en silencio. Las cintas esperan.',
    whispers: ['El cartel de ne\u00f3n emite una nota demasiado grave para o\u00edrla.', 'Algo en la estanter\u00eda lleva una etiqueta con tu letra.'],
  },
  stirring: {
    label: 'Despertando',
    headline: 'Las estanter\u00edas se han reordenado solas.',
    whispers: ['Alguien rebobin\u00f3 una cinta mientras no mirabas.', 'El CRT est\u00e1 caliente, y est\u00e1 apagado.'],
  },
  watching: {
    label: 'Vigilando',
    headline: 'Todas las pantallas del club te observan.',
    whispers: ['Los p\u00f3sters se han girado hacia la puerta.', 'Oyes risas grabadas en 1997.'],
  },
  shifted: {
    label: 'Transformado',
    headline: 'El club recuerda m\u00e1s que t\u00fa.',
    whispers: ['El plano del lugar no coincide con el de tu cabeza.', 'Un cuarto juego de huellas se adentra en el pasillo.'],
  },
  'archive-open': {
    label: 'Archivo abierto',
    headline: 'El Archivo 09 est\u00e1 abierto. El club escucha.',
    whispers: ['La puerta principal ha desaparecido. Entra luz desde alg\u00fan sitio.', 'Tres voces esperan a que elijas.'],
  },
};

export const STAGE_LABELS_EN: Readonly<Record<ClubStage, string>> = {
  dormant: 'Dormant',
  stirring: 'Stirring',
  watching: 'Watching',
  shifted: 'Shifted',
  'archive-open': 'Archive open',
};

export function tapeTitle(tapeId: string, language: Language): string {
  if (language === 'es') return TAPE_TITLES_ES[tapeId] ?? tapeId;
  if (tapeId === ARCHIVE_TAPE.id) return ARCHIVE_TAPE.title;
  return ACTS.find((act) => act.tape.id === tapeId)?.tape.title ?? tapeId;
}

export function describeObjective(objective: NarrativeObjective, language: Language): string {
  const spanish = language === 'es';
  switch (objective.kind) {
    case 'secret-ending-ready':
      return spanish ? 'El \u00faltimo fotograma est\u00e1 listo. M\u00edralo, o elige otro final.' : 'The last frame is ready. Watch it, or choose another ending.';
    case 'choose-ending':
      return spanish
        ? 'Elige c\u00f3mo termina el club: liberar los recuerdos o quedarte en la cinta.'
        : 'Choose how the club ends: release the memories or stay in the tape.';
    case 'restore-archive':
      return spanish ? 'Restaura el Archivo 09 en el CRT.' : 'Restore Archive 09 at the CRT.';
    case 'find-tape':
      return spanish ? `Encuentra la cinta "${tapeTitle(objective.tapeId, language)}".` : `Find the tape "${tapeTitle(objective.tapeId, language)}".`;
    case 'play-tape':
      return spanish
        ? `Reproduce "${tapeTitle(objective.tapeId, language)}" y pausa cuando la imagen se delate.`
        : `Play "${tapeTitle(objective.tapeId, language)}" and pause when the picture betrays itself.`;
    case 'play-game':
      return spanish ? `Juega a ${objective.gameName} en la m\u00e1quina recreativa.` : `Play ${objective.gameName} at the arcade.`;
    case 'locked':
      return spanish ? 'Termina primero el recuerdo anterior.' : 'Finish the previous memory first.';
  }
}

export function localizeFragment(fragment: JournalFragment, language: Language): LocalizedFragment {
  const caption = FRAGMENT_CAPTIONS[fragment.id]?.[language] ?? '';
  const spanish = language === 'es' ? FRAGMENT_COPY_ES[fragment.id] : undefined;
  return { id: fragment.id, title: spanish?.title ?? fragment.title, text: spanish?.text ?? fragment.text, caption };
}

export function localizeEnding(ending: EndingDefinition, language: Language): LocalizedEnding {
  if (language === 'es') return { id: ending.id, ...ENDINGS_ES[ending.id] };
  return { id: ending.id, title: ending.title, choiceLabel: ending.choiceLabel, text: ending.text };
}

export function localizeEndings(ids: readonly EndingId[], language: Language): LocalizedEnding[] {
  return ENDINGS.filter((ending) => ids.includes(ending.id)).map((ending) => localizeEnding(ending, language));
}

export function localizeAtmosphere(atmosphere: ClubAtmosphere, language: Language): LocalizedAtmosphere {
  const spanish = language === 'es' ? STAGE_COPY_ES[atmosphere.stage] : undefined;
  return {
    stage: atmosphere.stage,
    stageLabel: spanish?.label ?? STAGE_LABELS_EN[atmosphere.stage],
    distortion: atmosphere.distortion,
    headline: spanish?.headline ?? atmosphere.headline,
    whispers: spanish?.whispers ?? atmosphere.whispers,
    nextObjective: describeObjective(atmosphere.objective, language),
  };
}
