import { useEffect, useRef, useState } from 'react';
import './ui.css';
import type { Language } from './preferences';

export interface PlayScreenProps {
  language: Language;
  reducedDistortion: boolean;
  onPlay: () => void;
  onLanguageChange: (language: Language) => void;
}

/** Full-screen CRT start screen. Language buttons are available before the run begins. */
export function PlayScreen({ language, reducedDistortion, onPlay, onLanguageChange }: PlayScreenProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blink, setBlink] = useState(true);
  const es = language === 'es';

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (reducedDistortion) return undefined;
    const id = window.setInterval(() => setBlink((value) => !value), 700);
    return () => window.clearInterval(id);
  }, [reducedDistortion]);

  /* Scanlines + RGB aberration on the canvas backdrop. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const context = ctx;
    const surface = canvas;
    let frame = 0;
    let rafId = 0;
    function draw() {
      const width = surface.width;
      const height = surface.height;
      context.fillStyle = '#03040c';
      context.fillRect(0, 0, width, height);
      const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
      glow.addColorStop(0, 'rgba(100,80,20,0.18)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      for (let y = 0; y < height; y += 3) {
        context.fillStyle = `rgba(0,0,0,${0.22 + (y % 6 === 0 ? 0.1 : 0)})`;
        context.fillRect(0, y, width, 1);
      }
      if (!reducedDistortion) {
        const stripY = (frame * 2) % height;
        for (let x = 0; x < width; x += 2) {
          const value = Math.random() * 60;
          context.fillStyle = `rgba(${value + 60},${value + 50},${value + 30},0.12)`;
          context.fillRect(x, stripY, 2, 8);
        }
      }
      const vignette = context.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
      frame += 1;
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
        <p className="play-screen__sub">{es ? 'Algunos recuerdos deber\u00edan quedar olvidados.' : 'Some memories should stay forgotten.'}</p>
        <button
          ref={btnRef}
          type="button"
          className={`play-screen__btn${blink ? ' play-screen__btn--on' : ''}`}
          onClick={onPlay}
          translate="no"
        >
          {'[ PLAY \u25b6 ]'}
        </button>
        <div className="play-screen__languages" role="group" aria-label={es ? 'Selector de idioma' : 'Language selector'}>
          <button type="button" aria-pressed={language === 'es'} onClick={() => onLanguageChange('es')}>
            {'ESPA\u00d1OL'}
          </button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageChange('en')}>
            ENGLISH
          </button>
        </div>
        <p className="play-screen__hint">{es ? 'Haz clic o pulsa Enter / Espacio' : 'Click or press Enter / Space'}</p>
      </div>
    </div>
  );
}
