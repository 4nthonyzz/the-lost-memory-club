import { useEffect, useRef } from 'react';
import './ui.css';

export interface CrtShutdownProps {
  /** Called when the full 1.2 s animation is done. */
  onDone: () => void;
  reducedDistortion?: boolean;
}

/**
 * Classic CRT power-off in four phases:
 * 0.00–0.12 s  Clack + white edge flash
 * 0.12–0.32 s  Vertical collapse → horizontal white line
 * 0.32–0.50 s  Horizontal collapse → phosphor dot
 * 0.50–1.20 s  Dot fades, screen dims, done
 */
export function CrtShutdown({ onDone, reducedDistortion = false }: CrtShutdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dur = reducedDistortion ? 400 : 1200;
    const id = window.setTimeout(onDone, dur);
    return () => window.clearTimeout(id);
  }, [onDone, reducedDistortion]);

  const cls = ['crt-shutdown', reducedDistortion ? 'crt-shutdown--reduced' : ''].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={cls} aria-hidden="true">
      <div className="crt-shutdown__flash" />
      <div className="crt-shutdown__line" />
      <div className="crt-shutdown__dot" />
    </div>
  );
}
