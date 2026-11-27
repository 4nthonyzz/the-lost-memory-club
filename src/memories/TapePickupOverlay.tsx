import { useEffect } from 'react';
import { createVhsAudio } from './audio/vhsAudio';
import type { Language } from './i18n';
import { getPlayerStrings } from './i18n';
import './VhsPlayer.css';

export interface TapePickupOverlayProps {
  tapeLabel: string;
  language: Language;
  onComplete: () => void;
}

export function TapePickupOverlay({ tapeLabel, language, onComplete }: TapePickupOverlayProps) {
  const strings = getPlayerStrings(language);
  useEffect(() => {
    const audio = createVhsAudio();
    audio.update({ mode: 'stopped', signalQuality: 0, tension: 0, muted: false, reducedDistortion: false });
    void audio.resume().then(() => audio.insert()).catch(() => undefined);
    const timer = window.setTimeout(onComplete, 1300);
    return () => {
      window.clearTimeout(timer);
      audio.dispose();
    };
  }, [onComplete]);
  return (
    <div className="tape-pickup" role="presentation">
      <div className="tape-pickup__cassette" aria-hidden="true">
        <span />
        <span />
      </div>
      <strong>{strings.inserting}</strong>
      <small>{tapeLabel}</small>
    </div>
  );
}
