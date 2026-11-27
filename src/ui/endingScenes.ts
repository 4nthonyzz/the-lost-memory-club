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

function clockCard(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, glow: string): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 8, 14, 0.78)';
  ctx.fillRect(x - 110, y - 34, 220, 50);
  ctx.strokeStyle = glow;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 110, y - 34, 220, 50);
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = glow;
  ctx.font = 'bold 30px ui-monospace, "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 2);
  ctx.restore();
}

/** Final 1: golden dawn through the door; Maya smiles at Julian and fades with Leo and Sam; the clock reaches 01 NOV 1998. */
function drawDawn(ctx: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean, progress: number, caption: string): void {
  const sky = ctx.createLinearGradient(0, 0, 0, ENDING_HEIGHT);
  sky.addColorStop(0, mixColor('#1a1530', '#ffcf8a', progress));
  sky.addColorStop(1, mixColor('#24182c', '#f29b52', progress));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ENDING_WIDTH, ENDING_HEIGHT);
  const door = ctx.createLinearGradient(0, 70, 0, 290);
  door.addColorStop(0, `rgba(255, 236, 180, ${0.5 + progress * 0.5})`);
  door.addColorStop(1, `rgba(255, 170, 80, ${0.35 + progress * 0.5})`);
  ctx.fillStyle = door;
  ctx.fillRect(250, 70, 140, 220);
  ctx.fillStyle = `rgba(255, 220, 150, ${0.15 + progress * 0.25})`;
  ctx.beginPath();
  ctx.moveTo(250, 290);
  ctx.lineTo(390, 290);
  ctx.lineTo(560, ENDING_HEIGHT);
  ctx.lineTo(80, ENDING_HEIGHT);
  ctx.fill();
  ctx.fillStyle = '#1b1218';
  ctx.fillRect(0, 290, ENDING_WIDTH, ENDING_HEIGHT - 290);
  const fade = clamp01((progress - 0.35) / 0.5);
  const wave = (index: number) => (reducedDistortion ? -0.9 : -0.9 + Math.sin(elapsed * 3 + index) * 0.5);
  ctx.save();
  ctx.globalAlpha = 1 - fade;
  drawFigure(ctx, 300, 292, 66, wave(0));
  drawFigure(ctx, 340, 292, 60, wave(1));
  drawFigure(ctx, 375, 292, 64, wave(2));
  ctx.restore();
  drawFigure(ctx, 170, 296, 70, -2.2);
  ctx.fillStyle = 'rgba(255, 235, 200, 0.55)';
  for (let index = 0; index < 40; index += 1) {
    const x = (index * 97 + elapsed * 10 * (1 + (index % 3))) % ENDING_WIDTH;
    const y = ENDING_HEIGHT - ((index * 53 + elapsed * 18) % ENDING_HEIGHT);
    ctx.fillRect(x, y, 2, 2);
  }
  clockCard(ctx, progress > 0.7 ? caption : '31-09-98', ENDING_WIDTH / 2, 44, progress > 0.7 ? '#ffd27a' : '#ff6a5a');
}

/** Final 2: the friends and a fifth silhouette (you) laugh on the sofa in front of the lit arcade, under a clock stuck at 23:58. */
function drawForever(ctx: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean, progress: number, caption: string): void {
  const room = ctx.createLinearGradient(0, 0, 0, ENDING_HEIGHT);
  room.addColorStop(0, '#3a2350');
  room.addColorStop(1, '#170f22');
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, ENDING_WIDTH, ENDING_HEIGHT);
  ctx.fillStyle = '#231a36';
  ctx.fillRect(250, 60, 140, 200);
  ctx.fillStyle = `hsl(${(elapsed * 50) % 360} 85% 60%)`;
  ctx.fillRect(258, 68, 124, 20);
  ctx.fillStyle = '#0e3b44';
  ctx.fillRect(268, 98, 104, 80);
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = `hsl(${(elapsed * 80 + i * 60) % 360} 85% 62%)`;
    ctx.fillRect(278 + (i % 3) * 30, 110 + Math.floor(i / 3) * 30, 18, 18);
  }
  ctx.fillStyle = '#6b3047';
  ctx.fillRect(110, 250, 420, 46);
  ctx.fillRect(100, 220, 30, 76);
  ctx.fillRect(510, 220, 30, 76);
  ctx.fillStyle = '#7d3a55';
  ctx.fillRect(110, 228, 420, 30);
  const laugh = (index: number) => (reducedDistortion ? 0 : Math.abs(Math.sin(elapsed * 4 + index)) * 4);
  [160, 235, 310, 385].forEach((x, index) => {
    ctx.save();
    ctx.translate(0, -laugh(index));
    drawFigure(ctx, x, 262, 58, -1.1);
    ctx.restore();
  });
  ctx.save();
  ctx.globalAlpha = 0.55 + progress * 0.45;
  ctx.shadowColor = '#ffd27a';
  ctx.shadowBlur = 18;
  drawFigure(ctx, 465, 262, 60, -0.6);
  ctx.restore();
  ctx.globalAlpha = reducedDistortion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 5);
  clockCard(ctx, caption, ENDING_WIDTH / 2, 40, '#ffb454');
  ctx.globalAlpha = 1;
}

/** Final 3: dawn light; Julian steps out of the dark beside Leo and Sam and shelves the last tape, ARCHIVE-10: MAYA. */
function drawTruth(ctx: CanvasRenderingContext2D, elapsed: number, reducedDistortion: boolean, caption: string): void {
  const progress = sceneProgress(elapsed, reducedDistortion);
  const light = ctx.createLinearGradient(0, 0, ENDING_WIDTH, ENDING_HEIGHT);
  light.addColorStop(0, mixColor('#0b0a12', '#ffe2a8', progress));
  light.addColorStop(1, mixColor('#050408', '#e58a52', progress));
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, ENDING_WIDTH, ENDING_HEIGHT);
  ctx.fillStyle = '#5a3a28';
  ctx.fillRect(420, 70, 160, 220);
  for (let row = 0; row < 4; row += 1) {
    ctx.fillStyle = '#3b2519';
    ctx.fillRect(420, 120 + row * 45, 160, 5);
  }
  const step = clamp01(progress * 1.6);
  ctx.save();
  ctx.globalAlpha = 0.35 + step * 0.65;
  drawFigure(ctx, lerp(150, 330, step), 300, 70, -1.6);
  ctx.restore();
  drawFigure(ctx, 230, 300, 64, -0.9);
  drawFigure(ctx, 270, 300, 62, -0.9);
  const glow = 0.5 + 0.5 * Math.sin(elapsed * 2);
  ctx.save();
  ctx.shadowColor = '#ffd27a';
  ctx.shadowBlur = reducedDistortion ? 10 : 10 + glow * 20;
  ctx.fillStyle = '#14161f';
  ctx.fillRect(lerp(370, 470, step), 186, 64, 34);
  ctx.fillStyle = '#f3ead0';
  ctx.fillRect(lerp(374, 474, step), 192, 56, 14);
  ctx.restore();
  ctx.fillStyle = '#f6f0e0';
  ctx.font = 'bold 26px ui-monospace, "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(typewriterText(caption, elapsed, reducedDistortion), ENDING_WIDTH / 2, ENDING_HEIGHT - 22);
}
export function drawEnding(ctx: CanvasRenderingContext2D, id: EndingSceneId, elapsed: number, reducedDistortion: boolean, caption: string): void {
  const progress = sceneProgress(elapsed, reducedDistortion);
  const time = reducedDistortion ? 0 : elapsed;
  ctx.save();
  ctx.globalAlpha = 1;
  switch (id) {
    case 'bittersweet-dawn':
      drawDawn(ctx, time, reducedDistortion, progress, caption);
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
