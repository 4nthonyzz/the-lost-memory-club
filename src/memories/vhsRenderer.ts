import { FIRST_TAPE_ID, MEMORY_ID } from '../core/contracts';
import { SECOND_TAPE_ID, THIRD_TAPE_ID } from './fragments/memoryCatalog';
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

function drawArcadeScene(ctx: CanvasRenderingContext2D, t: number, reveal: number): void {
  fillRoom(ctx, '#11101f', '#2b1733');
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
  drawPerson(ctx, 140, 300, 140, '#07060c');
  drawPerson(ctx, 350, 300, 150, '#07060c');
  if (reveal > 0.05) {
    drawEye(ctx, 240, 145, 24, reveal);
    drawEye(ctx, 150, 70, 14, reveal);
    drawEye(ctx, 330, 80, 16, reveal);
    drawEye(ctx, 70, 150, 12, reveal);
    drawEye(ctx, 410, 160, 14, reveal);
  }
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

function drawScene(ctx: CanvasRenderingContext2D, tapeId: string, t: number, reveal: number): void {
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
    draw({ tapeId, time, position, mode, params }) {
      drawScene(sceneContext, tapeId, position, params.reveal);

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
          const y = (time * 220 + band * 90) % SCREEN_HEIGHT;
          const shift = Math.sin(time * 30 + band) * params.bandShift;
          context.drawImage(canvas, 0, y, SCREEN_WIDTH, 14, shift, y, SCREEN_WIDTH, 14);
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
    },
  };
}
