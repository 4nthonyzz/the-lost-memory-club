import { useEffect, useRef } from 'react';
import './ui.css';
import { getFlowStrings } from './flowStrings';
import type { Language } from './preferences';

export type IntroPhaseIndex = 0 | 1 | 2;

export interface IntroSequenceProps {
  /** 0 warm memory, 1 zoom out and electric cut, 2 waking up. */
  phase: IntroPhaseIndex;
  language: Language;
  reducedDistortion: boolean;
  onSkip: () => void;
}

const WIDTH = 640;
const HEIGHT = 360;
const FRIEND_COLORS = ['#ff7aa8', '#ffc04d', '#6fe0a8', '#7ab8ff'];

function pixelRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string): void {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawScanlines(context: CanvasRenderingContext2D): void {
  context.fillStyle = 'rgba(8, 12, 20, .22)';
  for (let y = 0; y < HEIGHT; y += 4) context.fillRect(0, y, WIDTH, 1);
}

function drawFriend(context: CanvasRenderingContext2D, x: number, y: number, color: string, phase: number, index: number): void {
  const bounce = Math.sin(phase * 4 + index) * 3;
  pixelRect(context, x + 5, y + bounce, 16, 16, '#f2c6a0');
  pixelRect(context, x, y + 16 + bounce, 26, 34, color);
  pixelRect(context, x - 8, y + 22 + bounce + (Math.sin(phase * 7 + index) > 0 ? -5 : 0), 8, 7, color);
  pixelRect(context, x + 26, y + 22 + bounce + (Math.sin(phase * 7 + index + 1) > 0 ? -5 : 0), 8, 7, color);
}

function drawWarmMemory(context: CanvasRenderingContext2D, elapsed: number): void {
  context.fillStyle = '#211226';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = '#b96352';
  context.fillRect(0, 228, WIDTH, 132);
  context.fillStyle = '#5d3153';
  context.fillRect(0, 210, WIDTH, 18);
  for (let index = 0; index < 3; index += 1) {
    const x = 75 + index * 190;
    pixelRect(context, x, 100, 112, 118, '#171b31');
    pixelRect(context, x + 8, 111, 96, 68, index === 1 ? '#b1425d' : '#2f8c9e');
    pixelRect(context, x + 15, 185, 82, 7, '#ffd05c');
    context.fillStyle = '#f8d778';
    context.font = 'bold 12px monospace';
    context.fillText(index === 1 ? 'SNAKE.EXE' : 'MIDNIGHT', x + 14, 207);
  }
  for (let index = 0; index < 4; index += 1) drawFriend(context, 150 + index * 86, 186, FRIEND_COLORS[index]!, elapsed, index);
  context.strokeStyle = '#ffd66b';
  context.lineWidth = 3;
  context.beginPath();
  for (let x = 0; x <= WIDTH; x += 8) {
    const y = 65 + Math.sin(x * 0.06 + elapsed * 5) * 13;
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.fillStyle = '#fff1c8';
  context.font = 'bold 20px monospace';
  context.fillText('REC ● 1997', 24, 34);
  context.font = 'bold 11px monospace';
  context.fillText('MAYA · LEO · SAM · JULIAN', 24, 52);
}

function drawElectricCut(context: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean): void {
  context.fillStyle = '#05070d';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const progress = Math.min(1, elapsed / 2.2);
  const scale = reducedDistortion ? 1 - progress * 0.2 : 1 - progress * 0.55;
  context.save();
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.scale(scale, scale);
  context.translate(-WIDTH / 2, -HEIGHT / 2);
  pixelRect(context, 70, 48, 500, 270, '#262b3d');
  pixelRect(context, 92, 70, 456, 210, '#101626');
  pixelRect(context, 115, 92, 410, 160, '#20374b');
  pixelRect(context, 118, 95, 4, 154, '#f04f6d');
  pixelRect(context, 518, 95, 4, 154, '#54d8e2');
  context.fillStyle = '#8de8e0';
  context.font = 'bold 18px monospace';
  context.fillText('KV-1996', 90, 38);
  context.restore();
  context.globalAlpha = reducedDistortion ? 1 : Math.max(0.25, 1 - progress * 0.5);
  context.fillStyle = '#ffd94f';
  context.font = 'bold 60px monospace';
  context.fillText('⚡', WIDTH / 2 - 26, HEIGHT / 2 + 28);
  context.globalAlpha = 1;
  drawScanlines(context);
}

function drawWake(context: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean): void {
  context.fillStyle = '#05060d';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const opening = reducedDistortion ? 0.42 : Math.min(0.88, elapsed / 2.5);
  const aperture = HEIGHT * opening;
  context.fillStyle = '#0f1422';
  context.fillRect(0, 0, WIDTH, (HEIGHT - aperture) / 2);
  context.fillRect(0, (HEIGHT + aperture) / 2, WIDTH, (HEIGHT - aperture) / 2);
  const pulse = reducedDistortion ? 0.45 : 0.28 + Math.abs(Math.sin(elapsed * 4)) * 0.35;
  context.strokeStyle = `rgba(117, 231, 214, ${pulse})`;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(WIDTH * 0.78, HEIGHT * 0.64, 16 + Math.abs(Math.sin(elapsed * 3)) * 8, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = '#9ee9dc';
  context.font = 'bold 11px monospace';
  context.fillText('TELEVISOR', WIDTH * 0.69, HEIGHT * 0.77);
  drawScanlines(context);
}

/** Canvas CRT intro: the DOM subtitle and skip control remain accessible over the animation. */
export function IntroSequence({ phase, language, reducedDistortion, onSkip }: IntroSequenceProps) {
  const strings = getFlowStrings(language).intro;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const className = ['intro-sequence', `intro-sequence--${phase}`, reducedDistortion ? 'intro-sequence--reduced' : ''].filter(Boolean).join(' ');

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;
    context.imageSmoothingEnabled = false;
    const started = performance.now();
    let frameId = 0;
    const draw = (now: number) => {
      const elapsed = Math.max(0, (now - started) / 1000);
      if (phase === 0) drawWarmMemory(context, elapsed);
      else if (phase === 1) drawElectricCut(context, elapsed, reducedDistortion);
      else drawWake(context, elapsed, reducedDistortion);
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [phase, reducedDistortion]);

  return (
    <div className={className} role="status" aria-live="polite" lang={language}>
      <button type="button" className="intro-skip" onClick={onSkip}>
        {strings.skip}
      </button>
      <div className="intro-sequence__crt" aria-label={phase === 0 ? strings.rec : phase === 1 ? 'KV-1996' : strings.thought} role="img">
        <canvas ref={canvasRef} className="intro-sequence__canvas" width={WIDTH} height={HEIGHT} aria-hidden="true" />
        <div className="intro-sequence__glass" aria-hidden="true" />
      </div>
      {phase === 2 && <p className="intro-thought" lang={language}>{strings.thought}</p>}
      {phase === 2 && <p className="intro-guide" role="status">{strings.guide}</p>}
    </div>
  );
}
