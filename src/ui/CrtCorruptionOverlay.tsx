import type { AnimationEvent, CSSProperties } from 'react';
import './ui.css';

export interface CrtCorruptionOverlayProps {
  level: number;
  reducedDistortion: boolean;
  powerOff?: boolean;
  onPowerOffComplete?: () => void;
}

export function clampCorruption(level: number): number {
  return Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
}

export function CrtCorruptionOverlay({ level, reducedDistortion, powerOff = false, onPowerOffComplete }: CrtCorruptionOverlayProps) {
  const corruption = clampCorruption(level);
  const glitching = !reducedDistortion && corruption > 0.05;
  const className = ['crt-overlay', glitching ? 'crt-overlay--glitch' : '', reducedDistortion ? 'crt-overlay--reduced' : '']
    .filter(Boolean)
    .join(' ');

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) onPowerOffComplete?.();
  }

  return (
    <div className={className} style={{ '--corruption': corruption } as CSSProperties} aria-hidden="true">
      <div className="crt-overlay__scanlines" />
      <div className="crt-overlay__glitch crt-overlay__glitch--a" />
      <div className="crt-overlay__glitch crt-overlay__glitch--b" />
      {powerOff && (
        <div className="crt-overlay__power" onAnimationEnd={handleAnimationEnd}>
          <div className="crt-overlay__beam" />
        </div>
      )}
    </div>
  );
}
