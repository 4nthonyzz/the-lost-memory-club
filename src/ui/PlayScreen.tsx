import { useEffect, useRef, useState } from 'react';
import './ui.css';
import type { Language } from './preferences';

export interface PlayScreenProps {
  language: Language;
  reducedDistortion: boolean;
  onPlay: () => void;
}

/** Full-screen CRT start screen shown before the intro. The player must click or press Enter/Space to start. */
export function PlayScreen({ language, reducedDistortion, onPlay }: PlayScreenProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blink, setBlink] = useState(true);
  const es = language === 'es';

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (reducedDistortion) return undefined;
    const id = window.setInterval(() => setBlink((v) => !v), 700);
    return () => window.clearInterval(id);
  }, [reducedDistortion]);

  /* Scanlines + RGB aberration on the canvas backdrop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let frame = 0;
    let rafId = 0;
    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = '#03040c';
      ctx.fillRect(0, 0, W, H);
      /* radial warm glow at centre simulating tube phosphor */
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, 'rgba(100,80,20,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      /* scanlines */
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = `rgba(0,0,0,${0.22 + (y % 6 === 0 ? 0.1 : 0)})`;
        ctx.fillRect(0, y, W, 1);
      }
      /* rolling static noise strip */
      if (!reducedDistortion) {
        const stripY = ((frame * 2) % H);
        for (let x = 0; x < W; x += 2) {
          const v = Math.random() * 60;
          ctx.fillStyle = `rgba(${v + 60},${v + 50},${v + 30},0.12)`;
          ctx.fillRect(x, stripY, 2, 8);
        }
      }
      /* CRT vignette */
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
      frame++;
      rafId = requestAnimationFrame(draw);
    }
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [reducedDistortion]);

  return (
    <div className="play-screen" role="dialog" aria-modal="true" aria-label={es ? 'Pantalla de inicio' : 'Start screen'}>
      <canvas ref={canvasRef} className="play-screen__canvas" width={960} height={540} aria-hidden="true" />
      <div className="play-screen__bezel" aria-hidden="true" />
      <div className="play-screen__content">
        <p className="play-screen__title" translate="no">MIDNIGHT RENTALS</p>
        <p className="play-screen__sub">{es ? 'Algunos recuerdos deberían quedarse olvidados.' : 'Some memories should stay forgotten.'}</p>
        <button
          ref={btnRef}
          type="button"
          className={`play-screen__btn${blink ? ' play-screen__btn--on' : ''}`}
          onClick={onPlay}
          translate="no"
        >
          {'[ PLAY \u25B6 ]'}
        </button>
        <p className="play-screen__hint">{es ? 'Haz clic o pulsa Enter / Espacio' : 'Click or press Enter / Space'}</p>
      </div>
    </div>
  );
}
