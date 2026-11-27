import { useEffect, useRef } from 'react';
import './ui.css';
import type { Language } from './preferences';

export interface MemoryUnlockedCardProps {
  language: Language;
  /** Cabinet name shown on the marquee, e.g. SNAKE.EXE. */
  machine: string;
  reducedDistortion: boolean;
  onClose: () => void;
}

const FRIENDS = [
  { name: 'MAYA', color: '#ff7aa8' },
  { name: 'LEO', color: '#ffc04d' },
  { name: 'SAM', color: '#6fe0a8' },
  { name: 'JULIAN', color: '#7ab8ff' },
] as const;

/** Celebration card shown after an arcade win: the four friends jump, high-five and hug around the cabinet under camera flashes. */
export function MemoryUnlockedCard({ language, machine, reducedDistortion, onClose }: MemoryUnlockedCardProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  const spanish = language === 'es';
  return (
    <section className={`memory-unlocked${reducedDistortion ? ' memory-unlocked--calm' : ''}`} role="dialog" aria-modal="true" aria-label={spanish ? 'Recuerdo desbloqueado' : 'Memory unlocked'} translate="no">
      <p className="memory-unlocked__eyebrow">{spanish ? 'RECUERDO DESBLOQUEADO' : 'MEMORY UNLOCKED'}</p>
      <div className="memory-unlocked__stage" aria-hidden="true">
        <div className="memory-unlocked__flash" />
        <div className="memory-unlocked__cabinet">
          <span className="memory-unlocked__marquee">{machine}</span>
          <span className="memory-unlocked__screen" />
        </div>
        <div className="memory-unlocked__crew">
          {FRIENDS.map((friend, index) => (
            <div key={friend.name} className={`memory-unlocked__friend memory-unlocked__friend--${index}`} style={{ ['--friend' as string]: friend.color }}>
              <span className="memory-unlocked__head" />
              <span className="memory-unlocked__body" />
              <span className="memory-unlocked__arm memory-unlocked__arm--l" />
              <span className="memory-unlocked__arm memory-unlocked__arm--r" />
              <span className="memory-unlocked__name">{friend.name}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="memory-unlocked__text">
        {spanish ? `${machine}: los cuatro gritando el récord, chocando los cinco y abrazándose. Una Polaroid nueva cuelga en el corcho.` : `${machine}: all four shouting the high score, high-fiving and hugging. A new Polaroid is pinned to the cork board.`}
      </p>
      <button ref={closeRef} type="button" className="memory-unlocked__button" onClick={onClose}>
        {spanish ? 'Guardar el recuerdo' : 'Keep the memory'}
      </button>
    </section>
  );
}
