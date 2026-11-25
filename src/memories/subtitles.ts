import { FIRST_TAPE_ID, MEMORY_ID } from '../core/contracts';
import type { Language } from './i18n';
import { SECOND_TAPE_ID, THIRD_TAPE_ID } from './fragments/memoryCatalog';

export interface SubtitleCue {
  start: number;
  end: number;
  en: string;
  es: string;
}

export const SUBTITLES: Readonly<Record<string, readonly SubtitleCue[]>> = {
  [FIRST_TAPE_ID]: [
    { start: 2, end: 12, en: 'Julian: Camera is rolling. Maya, thirty seconds to beat Leo\u2019s score.', es: 'Julian: La c\u00e1mara graba. Maya, treinta segundos para superar el r\u00e9cord de Leo.' },
    { start: 14, end: 26, en: 'Leo: Ladies and gentlemen, the crowd goes wild!', es: 'Leo: \u00a1Damas y caballeros, el p\u00fablico enloquece!' },
    { start: 28, end: 39, en: 'Sam: Writing it on the receipt. Nobody will believe this.', es: 'Sam: Lo apunto en el recibo. Nadie se lo va a creer.' },
    { start: 41, end: 44, en: 'Every screen in the shop is watching. 09-31-98.', es: 'Todas las pantallas de la tienda miran. 09-31-98.' },
    { start: 50, end: 62, en: 'Julian: Did the picture just blink? Keep filming.', es: 'Julian: \u00bfHa parpadeado la imagen? Sigue grabando.' },
    { start: 66, end: 80, en: 'Maya: High score! Same time next summer, right?', es: 'Maya: \u00a1R\u00e9cord! El pr\u00f3ximo verano a la misma hora, \u00bfverdad?' },
  ],
  [SECOND_TAPE_ID]: [
    { start: 2, end: 14, en: 'Sam: Oct 30. Mirror match. Winner buys the pizza.', es: 'Sam: 30 de octubre. Combate espejo. El ganador paga la pizza.' },
    { start: 16, end: 30, en: 'Maya: I\u2019m keeping score on my arm. Nobody smudge it.', es: 'Maya: Llevo la cuenta en el brazo. Que nadie lo borre.' },
    { start: 32, end: 50, en: 'Leo: Same costume, same moves. This isn\u2019t fair.', es: 'Leo: Mismo disfraz, mismos movimientos. Esto no es justo.' },
    { start: 52, end: 60, en: 'Sam: And the winner takes a bow!', es: 'Sam: \u00a1Y el ganador hace una reverencia!' },
    { start: 61, end: 64, en: 'Why are you fighting yourself?', es: '\u00bfPor qu\u00e9 luchas contra ti mismo?' },
    { start: 70, end: 90, en: 'Julian: Sam, turn around. Your shadow is still bowing.', es: 'Julian: Sam, date la vuelta. Tu sombra sigue haciendo la reverencia.' },
  ],
  [THIRD_TAPE_ID]: [
    { start: 2, end: 20, en: 'Julian: Oct 31, 1998. Two minutes to midnight. The radio never turns off.', es: 'Julian: 31 de octubre de 1998. Faltan dos minutos para medianoche. La radio nunca se apaga.' },
    { start: 22, end: 45, en: 'Maya: Everybody stay close. Count with me.', es: 'Maya: Todos juntos. Cuenten conmigo.' },
    { start: 48, end: 80, en: 'Leo: Julian, come back inside. Please.', es: 'Leo: Julian, vuelve adentro. Por favor.' },
    { start: 82, end: 110, en: 'Ten. Nine. Eight. Nobody is afraid.', es: 'Diez. Nueve. Ocho. Nadie tiene miedo.' },
    { start: 112, end: 116, en: '23:58. The radio hisses a name.', es: '23:58. La radio susurra un nombre.' },
    { start: 117, end: 120, en: 'The dead channel is looking back.', es: 'El canal muerto te devuelve la mirada.' },
  ],
  [MEMORY_ID]: [
    { start: 2, end: 18, en: 'Archive 09. Master reel. Do not rewind.', es: 'Archivo 09. Cinta maestra. No rebobinar.' },
    { start: 20, end: 46, en: 'Every tape ends the same way. Someone stops recording.', es: 'Todas las cintas terminan igual. Alguien deja de grabar.' },
    { start: 50, end: 56, en: 'Hold the signal. Hold it perfectly.', es: 'Mant\u00e9n la se\u00f1al. Mant\u00e9nla perfecta.' },
  ],
};

export function subtitleAt(tapeId: string, position: number, language: Language): string | null {
  const cue = SUBTITLES[tapeId]?.find((entry) => position >= entry.start && position < entry.end);
  return cue ? cue[language] : null;
}
