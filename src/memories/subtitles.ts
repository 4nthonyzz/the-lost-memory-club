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
    { start: 0.5, end: 4.3, en: 'Julian: Rolling! Midnight Rentals, summer of \u201997.', es: 'Julian: \u00a1Grabando! Midnight Rentals, verano del 97.' },
    { start: 4.6, end: 8.8, en: 'Maya: Queen of the arcade, at your service.', es: 'Maya: La reina del arcade, a tu servicio.' },
    { start: 9.1, end: 13.3, en: 'Leo: I\u2019m the funny one. Obviously.', es: 'Leo: Yo soy el gracioso. Obviamente.' },
    { start: 13.6, end: 17.8, en: 'Sam: One more try. I never give up.', es: 'Sam: Un intento m\u00e1s. Yo nunca me rindo.' },
    { start: 18.1, end: 22.3, en: 'Julian: And I\u2019m the one holding the camera. Always.', es: 'Julian: Y yo soy el que sostiene la c\u00e1mara. Siempre.' },
    { start: 22.6, end: 31.3, en: 'All: HIGH SCORE! Again, again!', es: 'Todos: \u00a1R\u00c9CORD! \u00a1Otra vez, otra vez!' },
    { start: 31.6, end: 35.8, en: 'Maya: Same time next summer. Promise?', es: 'Maya: El pr\u00f3ximo verano a la misma hora. \u00bfPrometido?' },
    { start: 36.1, end: 40.3, en: 'The lights burst. Something burns inside the cabinet.', es: 'Las luces estallan. Algo se quema dentro de la m\u00e1quina.' },
    { start: 40.5, end: 45, en: 'The calendar stops on a day that does not exist: 31-09-98.', es: 'El calendario se detiene en un d\u00eda que no existe: 31-09-98.' },
    { start: 46, end: 60, en: 'Their laughter keeps playing after the colours fade.', es: 'Sus risas siguen sonando cuando los colores se apagan.' },
    { start: 62, end: 80, en: 'Julian: Keep filming. Just\u2026 keep filming.', es: 'Julian: Sigue grabando. Solo\u2026 sigue grabando.' },
  ],
  [SECOND_TAPE_ID]: [
    { start: 0.5, end: 8.8, en: 'Oct 30, 1998. The last quiet afternoon.', es: '30 de octubre de 1998. La \u00faltima tarde tranquila.' },
    { start: 9.1, end: 17.8, en: 'Maya: I bought you a blank tape. Record something worth keeping.', es: 'Maya: Te compr\u00e9 una cinta vac\u00eda. Graba algo que valga la pena guardar.' },
    { start: 18.1, end: 26.8, en: 'Julian: Thanks\u2026 I will. (He doesn\u2019t say the rest.)', es: 'Julian: Gracias\u2026 lo har\u00e9. (No dice lo dem\u00e1s.)' },
    { start: 27.1, end: 40.3, en: 'Maya: You always film everyone. Who films you?', es: 'Maya: Siempre grabas a todos. \u00bfQui\u00e9n te graba a ti?' },
    { start: 40.5, end: 45, en: 'His reflection in the window holds the tape like a secret.', es: 'Su reflejo en la ventana sostiene la cinta como un secreto.' },
    { start: 49.5, end: 59.5, en: 'Rain hits the glass. Thunder. The tape cuts out.', es: 'La lluvia golpea el cristal. Un trueno. La cinta se corta.' },
  ],
  [THIRD_TAPE_ID]: [
    { start: 0.5, end: 12, en: 'Julian: If you find this\u2026 I\u2019m sorry.', es: 'Julian: Si encuentras esto\u2026 lo siento.' },
    { start: 13, end: 30, en: 'Julian: The night Maya didn\u2019t come back, the power went out.', es: 'Julian: La noche que Maya no volvi\u00f3, se fue la luz.' },
    { start: 31, end: 48, en: 'Julian: I couldn\u2019t let October end. So I stopped it.', es: 'Julian: No pod\u00eda dejar que octubre terminara. As\u00ed que lo detuve.' },
    { start: 49.5, end: 55, en: 'The channel goes dead. Only the date remains: 31-09-98.', es: 'El canal se apaga. Solo queda la fecha: 31-09-98.' },
  ],
  [MEMORY_ID]: [
    { start: 0.5, end: 12, en: 'Julian: Archive 09. The last tape I will ever record.', es: 'Julian: Archivo 09. La \u00faltima cinta que grabar\u00e9.' },
    { start: 13, end: 30, en: 'Julian: I froze the clock on the 31st of September\u2026', es: 'Julian: Detuve el reloj en el 31 de septiembre\u2026' },
    { start: 31, end: 48, en: 'Julian: \u2026because I couldn\u2019t accept a world without Maya.', es: 'Julian: \u2026porque no pod\u00eda aceptar un mundo sin Maya.' },
    { start: 49.5, end: 56, en: 'Julian: Let it play. Please\u2026 let it end.', es: 'Julian: D\u00e9jala correr. Por favor\u2026 deja que termine.' },
  ],
};

export function subtitleAt(tapeId: string, position: number, language: Language): string | null {
  const cue = SUBTITLES[tapeId]?.find((entry) => position >= entry.start && position < entry.end);
  return cue ? cue[language] : null;
}
