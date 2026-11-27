import { FIRST_TAPE_ID, MEMORY_ID } from '../core/contracts';
import { SECOND_TAPE_ID, THIRD_TAPE_ID } from './fragments/memoryCatalog';
import { drawStory, isCutMoment } from './vhsStory';
import type { TransportMode } from './restoration/types';
import type { VisualParams } from './vhsVisuals';

export const SCREEN_WIDTH = 480;
export const SCREEN_HEIGHT = 360;

export interface RenderInput {
  tapeId: string;
  time: number;
  position: number;
  mode: TransportMode;
  params: VisualParams;
}

export interface VhsRenderer {
  draw(input: RenderInput): void;
}

const TAU = Math.PI * 2;
const CHANNELS = [
  { color: '#ff0000', direction: -1 },
  { color: '#00ff00', direction: 0 },
  { color: '#0000ff', direction: 1 },
] as const;

function fillRoom(ctx: CanvasRenderingContext2D, top: string, bottom: string): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  ctx.fillStyle = '#07060b';
  ctx.fillRect(0, 290, SCREEN_WIDTH, SCREEN_HEIGHT - 290);
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, baseY: number, height: number, color: string): void {
  const head = height * 0.16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, baseY - height + head, head, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - head * 1.3, baseY - height + head * 2.2, head * 2.6, height - head * 2.2);
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f5f1e8';
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#b3122a';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.18, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawArcadeBase(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  fillRoom(ctx, '#11101f', '#2b1733');
  const neonPulse = 0.72 + Math.sin(t * 2.4) * 0.18;
  ctx.save();
  ctx.shadowColor = '#ff4f91';
  ctx.shadowBlur = 18 * neonPulse;
  ctx.fillStyle = `rgba(255, ${Math.round(105 + neonPulse * 70)}, 145, ${neonPulse})`;
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MIDNIGHT RENTALS', 240, 48);
  ctx.restore();
  for (let index = 0; index < 28; index += 1) {
    const x = (index * 83 + t * (4 + index % 3)) % SCREEN_WIDTH;
    const y = 62 + ((index * 47) % 205);
    const alpha = 0.15 + ((Math.sin(t * 1.7 + index) + 1) * 0.12);
    ctx.fillStyle = `rgba(255,210,150,${alpha})`;
    ctx.fillRect(x, y, 1 + index % 2, 1 + index % 2);
  }
  ctx.fillStyle = '#1b1b2e';
  ctx.fillRect(190, 90, 100, 200);
  ctx.fillStyle = '#ff3b6b';
  ctx.fillRect(195, 95, 90, 10);
  ctx.fillStyle = '#06222a';
  ctx.fillRect(205, 115, 70, 60);
  for (let index = 0; index < 9; index += 1) {
    ctx.fillStyle = `hsl(${(t * 40 + index * 40) % 360} 80% 55%)`;
    ctx.fillRect(210 + (index % 3) * 22, 120 + Math.floor(index / 3) * 18, 12, 10);
  }
  ctx.fillStyle = '#2a2a44';
  ctx.fillRect(200, 190, 80, 12);
  drawPerson(ctx, 140 + Math.sin(t * 1.5) * 5, 300, 140, '#07060c');
  drawPerson(ctx, 350 + Math.cos(t * 1.2) * 6, 300, 150, '#07060c');
  if (reveal > 0.05) {
    const shadowApproach = Math.min(1, reveal * 1.35);
    ctx.save();
    ctx.globalAlpha = shadowApproach * 0.72;
    ctx.fillStyle = '#020205';
    ctx.beginPath();
    ctx.ellipse(240, 275, 38 + shadowApproach * 32, 105 + shadowApproach * 65, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    drawEye(ctx, 225, 145, 24 * shadowApproach, shadowApproach);
    drawEye(ctx, 255, 145, 24 * shadowApproach, shadowApproach);
  }
  if (reveal > 0.82) {
    ctx.fillStyle = `rgba(255,245,210,${0.08 + Math.abs(Math.sin(t * 8)) * 0.15})`;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }
}

function drawArticulatedFriend(ctx: CanvasRenderingContext2D, x: number, ground: number, scale: number, phase: number, color: string, armLift: number): void {
  const walk = Math.sin(phase) * 5 * scale;
  const headY = ground - 82 * scale;
  ctx.save();
  ctx.translate(x + walk, 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, headY, 11 * scale, 0, TAU);
  ctx.fill();
  ctx.fillRect(-15 * scale, headY + 12 * scale, 30 * scale, 42 * scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11 * scale, headY + 20 * scale);
  ctx.lineTo((-25 + Math.sin(phase) * 8) * scale, headY + (42 - armLift) * scale);
  ctx.moveTo(11 * scale, headY + 20 * scale);
  ctx.lineTo((25 + Math.cos(phase) * 8) * scale, headY + (42 - armLift) * scale);
  ctx.moveTo(-7 * scale, headY + 54 * scale);
  ctx.lineTo((-14 + Math.sin(phase) * 8) * scale, ground);
  ctx.moveTo(7 * scale, headY + 54 * scale);
  ctx.lineTo((14 - Math.sin(phase) * 8) * scale, ground);
  ctx.stroke();
  ctx.restore();
}

function drawCinemaScene(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  fillRoom(ctx, '#111b35', '#211b35');
  ctx.fillStyle = '#151a2d';
  ctx.fillRect(155, 65, 170, 104);
  ctx.fillStyle = `rgba(100, ${Math.round(170 + Math.sin(t) * 25)}, 230, .75)`;
  ctx.fillRect(166, 76, 148, 82);
  ctx.fillStyle = '#4b3040';
  ctx.fillRect(0, 270, SCREEN_WIDTH, 90);
  drawArticulatedFriend(ctx, 125, 285, 1.05, t * 1.2, '#d28c63', 5);
  drawArticulatedFriend(ctx, 240, 285, 1.05, t * 1.2 + 1.8, '#936b9f', 8);
  drawArticulatedFriend(ctx, 355, 285, 1.05, t * 1.2 + 3.4, '#638f9e', 4);
  ctx.fillStyle = '#bb8a52';
  ctx.fillRect(203 + Math.sin(t * 1.5) * 14, 250, 34, 20);
  ctx.fillStyle = '#0a0c16';
  ctx.fillRect(209 + Math.sin(t * 1.5) * 14, 254, 22, 12);
  if (reveal > .75) {
    ctx.fillStyle = `rgba(230, 210, 150, ${reveal * .25})`;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }
}

function drawRuptureScene(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  fillRoom(ctx, '#171525', '#080a12');
  const zoom = Math.min(1, Math.max(0, (t - 55) / 25));
  ctx.save();
  ctx.translate(240, 180);
  ctx.scale(1 + zoom * .65, 1 + zoom * .65);
  ctx.translate(-240, -180);
  ctx.fillStyle = '#080b13';
  ctx.fillRect(110, 55, 260, 190);
  ctx.fillStyle = '#243445';
  ctx.fillRect(130, 75, 220, 130);
  ctx.fillStyle = '#0b1018';
  ctx.fillRect(145, 90, 190, 100);
  drawEye(ctx, 206, 130, 15, .2 + reveal * .8);
  drawEye(ctx, 274, 130, 15, .2 + reveal * .8);
  ctx.fillStyle = '#d6bd7e';
  ctx.rotate(-.08);
  ctx.fillRect(175, 218, 130, 38);
  ctx.fillStyle = '#302517';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('09-31-98', 188, 242);
  ctx.restore();
  const staticLines = 4 + Math.floor(reveal * 12);
  for (let index = 0; index < staticLines; index += 1) {
    const y = 40 + ((t * 65 + index * 37) % 260);
    ctx.fillStyle = `rgba(190,220,235,${.08 + reveal * .14})`;
    ctx.fillRect(0, y, SCREEN_WIDTH, 1 + (index % 3));
  }
}

function drawArcadeScene(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  if (t < 30) drawArcadeBase(ctx, t, reveal);
  else if (t < 55) drawCinemaScene(ctx, t, reveal);
  else drawRuptureScene(ctx, t, reveal);
}
function drawMirrorMatchScene(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  fillRoom(ctx, '#161226', '#2a1a3a');
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(239, 40, 2, 250);
  drawPerson(ctx, 150, 300, 150, '#3a1f5c');
  drawPerson(ctx, 330, 300, 150, '#3a1f5c');
  ctx.save();
  ctx.translate(240, 290);
  ctx.rotate(Math.sin(t * 1.5) * 0.12);
  ctx.globalAlpha = 0.8;
  drawPerson(ctx, 0, 0, 220, '#000');
  ctx.globalAlpha = (1 - reveal) * 0.7;
  ctx.fillStyle = '#cfc7e8';
  ctx.fillRect(-12, -192, 6, 6);
  ctx.fillRect(6, -192, 6, 6);
  ctx.fillRect(-10, -176, 20, 3);
  ctx.restore();
}

function drawBroadcastScene(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  fillRoom(ctx, '#0b1220', '#1b1a2c');
  for (let index = 0; index < 13; index += 1) {
    const x = 20 + index * 36;
    ctx.fillStyle = `hsl(${(index * 55) % 360} 85% 60%)`;
    ctx.beginPath();
    ctx.arc(x, 40 + Math.sin(index) * 8 + (index % 2) * 6, 5, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#26243a';
  ctx.fillRect(210, 230, 60, 50);
  ctx.fillRect(255, 190, 3, 40);
  ctx.strokeStyle = 'rgba(190,225,255,0.5)';
  ctx.lineWidth = 2;
  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    ctx.arc(240, 230, 30 + ring * 22 + ((t * 20) % 22), Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  if (reveal > 0.05) {
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.strokeStyle = '#cfe9ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(200, 110, 18, 10, 0, 0, TAU);
    ctx.ellipse(280, 110, 18, 10, 0, 0, TAU);
    ctx.moveTo(205, 170);
    ctx.quadraticCurveTo(240, 195, 275, 170);
    ctx.stroke();
    ctx.restore();
  }
}

function drawArchiveScene(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  ctx.fillStyle = '#020204';
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  ctx.strokeStyle = '#2a2a33';
  ctx.lineWidth = 6;
  ctx.strokeRect(120, 30, 240, 290);
  const sheen = ctx.createLinearGradient(120, 30, 360, 320);
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(120, 30, 240, 290);
  ctx.globalAlpha = 0.25 + reveal * 0.6;
  drawPerson(ctx, 240, 320, 200, '#15151c');
  ctx.globalAlpha = 1;
  if (Math.floor(t * 1.5) % 2 === 0) {
    ctx.fillStyle = '#ff1c1c';
    ctx.beginPath();
    ctx.arc(150, 58, 6, 0, TAU);
    ctx.fill();
    ctx.font = 'bold 16px monospace';
    ctx.fillText('REC', 164, 64);
  }
}

function drawTimestamp(ctx: CanvasRenderingContext2D, tapeId: string, position: number): void {
  const minutes = Math.floor(position / 60).toString().padStart(2, '0');
  const seconds = Math.floor(position % 60).toString().padStart(2, '0');
  ctx.fillStyle = 'rgba(235,240,225,.78)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  const stamp = tapeId === MEMORY_ID ? '31-09-98' : tapeId === SECOND_TAPE_ID ? 'OCT 30 1998' : tapeId === THIRD_TAPE_ID ? '31-09-98' : 'AUG 17 1997';
  ctx.fillText(`${stamp}  ${minutes}:${seconds}`, SCREEN_WIDTH - 14, 20);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 70, 70, .9)';
  ctx.font = 'bold 11px monospace';
  if (Math.floor(position * 2) % 2 === 0) ctx.fillText(`REC ${String.fromCharCode(0x25cf)}`, 14, 20);
}

function drawScene(ctx: CanvasRenderingContext2D, tapeId: string, t: number, reveal: number, calm = false): void {
  if (drawStory(ctx, tapeId, t, calm)) return;
  switch (tapeId) {
    case FIRST_TAPE_ID:
      return drawArcadeScene(ctx, t, reveal);
    case SECOND_TAPE_ID:
      return drawMirrorMatchScene(ctx, t, reveal);
    case THIRD_TAPE_ID:
      return drawBroadcastScene(ctx, t, reveal);
    case MEMORY_ID:
      return drawArchiveScene(ctx, t, reveal);
    default:
      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }
}

function createLayer(): HTMLCanvasElement {
  const layer = document.createElement('canvas');
  layer.width = SCREEN_WIDTH;
  layer.height = SCREEN_HEIGHT;
  return layer;
}

export function createVhsRenderer(canvas: HTMLCanvasElement): VhsRenderer | null {
  const context = canvas.getContext('2d');
  const sceneLayer = createLayer();
  const channelLayer = createLayer();
  const sceneContext = sceneLayer.getContext('2d');
  const channelContext = channelLayer.getContext('2d');
  if (!context || !sceneContext || !channelContext) return null;

  return {
    draw(input) {
      try {
        const { tapeId, mode } = input;
        const time = Number.isFinite(input.time) ? input.time : 0;
        const position = Number.isFinite(input.position) ? Math.max(0, input.position) : 0;
        const params = {
          ...input.params,
          noise: Number.isFinite(input.params.noise) ? Math.max(0, Math.min(1, input.params.noise)) : 0,
          jitter: Number.isFinite(input.params.jitter) ? Math.max(0, input.params.jitter) : 0,
          chromatic: Number.isFinite(input.params.chromatic) ? Math.max(0, input.params.chromatic) : 0,
          bandShift: Number.isFinite(input.params.bandShift) ? Math.max(0, input.params.bandShift) : 0,
          flicker: Number.isFinite(input.params.flicker) ? Math.max(0, Math.min(1, input.params.flicker)) : 0,
          reveal: Number.isFinite(input.params.reveal) ? Math.max(0, Math.min(1, input.params.reveal)) : 0,
        };
        drawScene(sceneContext, tapeId, position, params.reveal, params.reducedDistortion);
        drawTimestamp(sceneContext, tapeId, position);
        if (mode === 'playing' && isCutMoment(position)) {
          for (let band = 0; band < (params.reducedDistortion ? 2 : 6); band += 1) {
            const y = (band * 61 + time * 400) % SCREEN_HEIGHT;
            sceneContext.fillStyle = `rgba(220, 230, 240, ${params.reducedDistortion ? 0.18 : 0.45})`;
            sceneContext.fillRect(0, y, SCREEN_WIDTH, 6 + (band % 3) * 4);
          }
        }
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = '#000';
        context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        const dx = (Math.random() - 0.5) * 2 * params.jitter;
        const dy = (Math.random() - 0.5) * params.jitter;

        if (params.chromatic < 0.5) {
          context.drawImage(sceneLayer, dx, dy);
        } else {
          context.globalCompositeOperation = 'lighter';
          for (const channel of CHANNELS) {
            channelContext.globalCompositeOperation = 'source-over';
            channelContext.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            channelContext.drawImage(sceneLayer, 0, 0);
            channelContext.globalCompositeOperation = 'multiply';
            channelContext.fillStyle = channel.color;
            channelContext.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            context.drawImage(channelLayer, dx + channel.direction * params.chromatic, dy);
          }
          context.globalCompositeOperation = 'source-over';
        }

        if (params.bandShift > 0) {
          for (let band = 0; band < 4; band += 1) {
            const y = Math.max(0, Math.min(SCREEN_HEIGHT - 14, (time * 220 + band * 90) % SCREEN_HEIGHT));
            const shift = Math.sin(time * 30 + band) * params.bandShift;
            context.drawImage(sceneLayer, 0, y, SCREEN_WIDTH, 14, shift, y, SCREEN_WIDTH, 14);
          }
        }

        const specks = Math.floor(params.noise * 900);
        for (let index = 0; index < specks; index += 1) {
          const shade = Math.floor(Math.random() * 255);
          context.fillStyle = `rgba(${shade},${shade},${shade},0.55)`;
          context.fillRect(Math.random() * SCREEN_WIDTH, Math.random() * SCREEN_HEIGHT, 1 + Math.random() * 3, 1);
        }

        if (mode === 'paused' || mode === 'rewind' || mode === 'ffwd') {
          context.fillStyle = 'rgba(235,235,235,0.35)';
          context.fillRect(0, SCREEN_HEIGHT - 26 + Math.random() * 3, SCREEN_WIDTH, 2);
        }

        if (params.flicker > 0) {
          context.fillStyle = `rgba(0,0,0,${Math.random() * params.flicker})`;
          context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        }
      } catch {
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = '#090b12';
        context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        context.fillStyle = '#c9d0e0';
        context.font = '14px monospace';
        context.fillText('VHS signal recovering...', 18, 28);
      }
    },
  };
}
