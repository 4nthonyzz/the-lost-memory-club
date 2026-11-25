import type { EndingSceneId } from './viewModels';

export const ENDING_WIDTH = 640;
export const ENDING_HEIGHT = 360;
export const SCENE_DURATION = 10;

const TAU = Math.PI * 2;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function sceneProgress(elapsed: number, reducedDistortion: boolean): number {
  return reducedDistortion ? 1 : clamp01(elapsed / SCENE_DURATION);
}

export function typewriterText(text: string, elapsed: number, reducedDistortion: boolean, delay = 2, charsPerSecond = 16): string {
  if (reducedDistortion) return text;
  const count = Math.floor((elapsed - delay) * charsPerSecond);
  return count <= 0 ? '' : text.slice(0, count);
}

export function mixColor(from: string, to: string, amount: number): string {
  const parse = (hex: string): [number, number, number] => {
    const value = Number.parseInt(hex.replace('#', ''), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const a = parse(from);
  const b = parse(to);
  const t = clamp01(amount);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

function drawFigure(ctx: CanvasRenderingContext2D, x: number, baseY: number, height: number, wave: number): void {
  const head = height * 0.16;
  ctx.fillStyle = '#0a070b';
  ctx.beginPath();
  ctx.arc(x, baseY - height + head, head, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - head * 1.1, baseY - height + head * 2.2, head * 2.2, height - head * 2.2);
  ctx.strokeStyle = '#0a070b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + head, baseY - height + head * 2.6);
  ctx.lineTo(x + head + Math.cos(wave) * 26, baseY - height + head * 2.6 + Math.sin(wave) * 26);
  ctx.stroke();
}

function drawDawn(ctx: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean, progress: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, ENDING_HEIGHT);
  sky.addColorStop(0, mixColor('#0a0b18', '#4a3550', progress));
  sky.addColorStop(1, mixColor('#1a1426', '#f2a65a', progress));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ENDING_WIDTH, ENDING_HEIGHT);

  ctx.save();
  ctx.shadowColor = '#ffb865';
  ctx.shadowBlur = 60 * progress;
  ctx.fillStyle = `rgba(255, 220, 160, ${0.4 + progress * 0.55})`;
  ctx.beginPath();
  ctx.arc(ENDING_WIDTH / 2, lerp(ENDING_HEIGHT + 70, 210, progress), 70, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#120d14';
  ctx.fillRect(0, 280, ENDING_WIDTH, ENDING_HEIGHT - 280);
  const door = ctx.createLinearGradient(0, 150, 0, 280);
  door.addColorStop(0, `rgba(255, 210, 140, ${0.35 + progress * 0.5})`);
  door.addColorStop(1, `rgba(255, 150, 70, ${0.2 + progress * 0.4})`);
  ctx.fillStyle = door;
  ctx.fillRect(260, 150, 120, 130);

  const wave = (index: number) => (reducedDistortion ? -0.9 : -0.9 + Math.sin(elapsed * 3 + index) * 0.5);
  drawFigure(ctx, 290, 282, 62, wave(0));
  drawFigure(ctx, 320, 282, 58, wave(1));
  drawFigure(ctx, 350, 282, 66, wave(2));

  ctx.fillStyle = 'rgba(255, 230, 190, 0.4)';
  for (let index = 0; index < 30; index += 1) {
    const x = (index * 97 + elapsed * 8 * (1 + (index % 3))) % ENDING_WIDTH;
    const y = (index * 53 + elapsed * 5) % ENDING_HEIGHT;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawForever(ctx: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean, progress: number, caption: string): void {
  ctx.fillStyle = '#050403';
  ctx.fillRect(0, 0, ENDING_WIDTH, ENDING_HEIGHT);
  ctx.save();
  ctx.translate(ENDING_WIDTH / 2, ENDING_HEIGHT / 2);
  ctx.scale(1 + progress * 0.8, 1 + progress * 0.8);
  const screen = ctx.createLinearGradient(0, -130, 0, 130);
  screen.addColorStop(0, '#3a2410');
  screen.addColorStop(1, '#0e0805');
  ctx.fillStyle = screen;
  ctx.fillRect(-220, -130, 440, 260);
  for (let index = 0; index < 14; index += 1) {
    ctx.fillStyle = `hsl(${(index * 47) % 360} 80% 60%)`;
    ctx.beginPath();
    ctx.arc(-200 + index * 31, -105 + Math.sin(index) * 8, 5, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  for (let y = -130; y < 130; y += 4) ctx.fillRect(-220, y, 440, 1);
  ctx.restore();

  const flicker = reducedDistortion ? 1 : 0.92 + 0.08 * Math.sin(elapsed * 6);
  ctx.globalAlpha = flicker;
  ctx.fillStyle = '#ffb454';
  ctx.font = 'bold 44px ui-monospace, "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(caption, ENDING_WIDTH / 2, ENDING_HEIGHT / 2 + 16);
  ctx.fillRect(ENDING_WIDTH - 70, 24, 8, 26);
  ctx.fillRect(ENDING_WIDTH - 54, 24, 8, 26);
  ctx.globalAlpha = 1;
}

function drawTruth(ctx: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean, caption: string): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ENDING_WIDTH, ENDING_HEIGHT);
  ctx.strokeStyle = '#2a2a33';
  ctx.lineWidth = 6;
  ctx.strokeRect(170, 24, 300, 290);
  const sheen = ctx.createLinearGradient(170, 24, 470, 314);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(170, 24, 300, 290);

  ctx.fillStyle = '#12121a';
  ctx.beginPath();
  ctx.arc(320, 130, 30, 0, TAU);
  ctx.fill();
  ctx.fillRect(285, 164, 70, 150);
  ctx.fillStyle = '#1b1b24';
  ctx.fillRect(352, 210, 18, 34);
  ctx.fillStyle = '#7a1218';
  ctx.fillRect(357, 216, 6, 6);

  const ledOn = reducedDistortion || Math.floor(elapsed * 1.5) % 2 === 0;
  if (ledOn) {
    ctx.fillStyle = '#ff1c1c';
    ctx.beginPath();
    ctx.arc(200, 54, 7, 0, TAU);
    ctx.fill();
    ctx.font = 'bold 18px ui-monospace, "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REC', 216, 60);
  }

  ctx.fillStyle = '#e8e8e8';
  ctx.font = '26px ui-monospace, "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(typewriterText(caption, elapsed, reducedDistortion), ENDING_WIDTH / 2, ENDING_HEIGHT - 20);
}

export function drawEnding(ctx: CanvasRenderingContext2D, id: EndingSceneId, elapsed: number, reducedDistortion: boolean, caption: string): void {
  const progress = sceneProgress(elapsed, reducedDistortion);
  const time = reducedDistortion ? 0 : elapsed;
  ctx.save();
  ctx.globalAlpha = 1;
  switch (id) {
    case 'bittersweet-dawn':
      drawDawn(ctx, time, reducedDistortion, progress);
      break;
    case 'forever-1998':
      drawForever(ctx, time, reducedDistortion, progress, caption);
      break;
    case 'archivists-truth':
      drawTruth(ctx, time, reducedDistortion, caption);
      break;
  }
  ctx.restore();
}
