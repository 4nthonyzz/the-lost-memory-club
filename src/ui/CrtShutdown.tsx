import { useEffect, useRef } from 'react';
import './ui.css';

export interface CrtShutdownProps {
  /** Called once when the animation ends. Later renders do not restart the timer. */
  onDone: () => void;
  reducedDistortion?: boolean;
}

export const SHUTDOWN_MS = 1200;
export const SHUTDOWN_REDUCED_MS = 400;

/** The four phases in seconds. The keyframe delays in ui.css follow the same values. */
export const SHUTDOWN_PHASES = [
  { name: 'flash', start: 0, end: 0.12 },
  { name: 'vertical-collapse', start: 0.12, end: 0.32 },
  { name: 'horizontal-collapse', start: 0.32, end: 0.5 },
  { name: 'fade', start: 0.5, end: 1.2 },
] as const;

/**
 * Classic CRT power-off, with the timing fixed in ui.css:
 * 0.00 to 0.12 s  white flash
 * 0.12 to 0.32 s  picture collapses vertically into a horizontal white line
 * 0.32 to 0.50 s  the line collapses horizontally into a bright dot
 * 0.50 to 1.20 s  the dot fades and the screen dims to black, then the start screen returns
 */
export function CrtShutdown({ onDone, reducedDistortion = false }: CrtShutdownProps) {
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const id = window.setTimeout(() => doneRef.current(), reducedDistortion ? SHUTDOWN_REDUCED_MS : SHUTDOWN_MS);
    return () => window.clearTimeout(id);
  }, [reducedDistortion]);

  const className = ['crt-shutdown', reducedDistortion ? 'crt-shutdown--reduced' : ''].filter(Boolean).join(' ');

  return (
    <div className={className} aria-hidden="true">
      <div className="crt-shutdown__flash" />
      <div className="crt-shutdown__picture" />
      <div className="crt-shutdown__line" />
      <div className="crt-shutdown__dot" />
      <div className="crt-shutdown__dim" />
    </div>
  );
}
