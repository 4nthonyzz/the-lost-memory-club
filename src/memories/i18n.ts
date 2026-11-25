import type { TransportMode } from './restoration/types';

export type Language = 'en' | 'es';

export interface PlayerStrings {
  region: string;
  screenLabel: string;
  modes: Record<TransportMode, string>;
  rewind: string;
  play: string;
  pause: string;
  stop: string;
  fastForward: string;
  stepBack: string;
  stepForward: string;
  trackingDown: string;
  trackingUp: string;
  trackingSlider: string;
  trackingLabel: string;
  signalLabel: string;
  mute: string;
  unmute: string;
  close: string;
  clueRecorded: string;
  perfectTracking: string;
  hint: string;
  keyboardHelp: string;
  timeline: string;
  timelineAnomaly: string;
  stepPause: string;
  stepTune: string;
}

const EN: PlayerStrings = {
  region: 'VHS player',
  screenLabel: 'Tape playback screen',
  modes: { stopped: 'STOP', playing: 'PLAY', paused: 'PAUSE', rewind: 'REW', ffwd: 'FF' },
  rewind: 'Rewind',
  play: 'Play',
  pause: 'Pause',
  stop: 'Stop',
  fastForward: 'Fast forward',
  stepBack: 'Previous frame',
  stepForward: 'Next frame',
  trackingDown: 'Tracking down',
  trackingUp: 'Tracking up',
  trackingSlider: 'Tracking adjustment',
  trackingLabel: 'Tracking',
  signalLabel: 'Signal',
  mute: 'Mute',
  unmute: 'Unmute',
  close: 'Eject and close',
  clueRecorded: 'CLUE RECORDED',
  perfectTracking: '100% TRACKING \u00b7 PERFECT SIGNAL',
  hint: 'Pause on the strange frame and adjust the tracking.',
  keyboardHelp: 'Space play/pause \u00b7 \u2190/\u2192 rewind/forward \u00b7 , . step frame \u00b7 [ ] or \u2193/\u2191 tracking (Shift for \u00b15) \u00b7 Esc close',
  timeline: 'Tape position',
  timelineAnomaly: 'Anomaly zone',
  stepPause: '1. Pause on the anomaly',
  stepTune: '2. Tune the tracking',
};

const ES: PlayerStrings = {
  region: 'Reproductor VHS',
  screenLabel: 'Pantalla de reproducci\u00f3n de la cinta',
  modes: { stopped: 'DETENIDO', playing: 'REPRODUCIENDO', paused: 'PAUSA', rewind: 'REBOBINANDO', ffwd: 'AVANZANDO' },
  rewind: 'Rebobinar',
  play: 'Reproducir',
  pause: 'Pausar',
  stop: 'Detener',
  fastForward: 'Avance r\u00e1pido',
  stepBack: 'Fotograma anterior',
  stepForward: 'Fotograma siguiente',
  trackingDown: 'Bajar tracking',
  trackingUp: 'Subir tracking',
  trackingSlider: 'Ajuste de tracking',
  trackingLabel: 'Tracking (Sinton\u00eda)',
  signalLabel: 'Se\u00f1al',
  mute: 'Silenciar',
  unmute: 'Activar sonido',
  close: 'Expulsar y cerrar',
  clueRecorded: 'PISTA REGISTRADA',
  perfectTracking: '100% TRACKING \u00b7 SE\u00d1AL PERFECTA',
  hint: 'Pausa en el fotograma extra\u00f1o y ajusta el tracking.',
  keyboardHelp: 'Espacio reproducir/pausa \u00b7 \u2190/\u2192 rebobinar/avanzar \u00b7 , . fotograma \u00b7 [ ] o \u2193/\u2191 tracking (May\u00fas para \u00b15) \u00b7 Esc para cerrar',
  timeline: 'Posici\u00f3n en la cinta',
  timelineAnomaly: 'Zona de anomal\u00eda',
  stepPause: '1. Pausa en la anomal\u00eda',
  stepTune: '2. Ajusta el tracking',
};

export function getPlayerStrings(language: Language): PlayerStrings {
  return language === 'es' ? ES : EN;
}
