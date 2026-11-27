import { FIRST_TAPE_ID, MEMORY_ID, SECOND_TAPE_ID, THIRD_TAPE_ID } from '../core/contracts';

export const SHOT_LENGTH = 4.5;
const W = 480;
const H = 360;
const TAU = Math.PI * 2;

export interface Friend {
  name: string;
  role: string;
  color: string;
}

export const FRIENDS: readonly Friend[] = [
  { name: 'MAYA', role: 'The Arcade Queen', color: '#ff7aa8' },
  { name: 'LEO', role: 'The Club Jester', color: '#ffc04d' },
  { name: 'SAM', role: 'Never Gives Up', color: '#6fe0a8' },
  { name: 'JULIAN', role: 'Always Recording', color: '#7ab8ff' },
];

export function shotIndex(position: number): number {
  return Math.floor(Math.max(0, position) / SHOT_LENGTH);
}

/** 0..1 inside the current shot. */
function shotProgress(position: number): number {
  return (Math.max(0, position) % SHOT_LENGTH) / SHOT_LENGTH;
}

/** True during the first and last few frames of a shot, where the tape shows a static band. */
export function isCutMoment(position: number): boolean {
  const p = shotProgress(position);
  return p < 0.05 || p > 0.97;
}

function room(ctx: CanvasRenderingContext2D, top: string, bottom: string, floor = '#3b2a35'): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 280, W, H - 280);
}

function shelves(ctx: CanvasRenderingContext2D, x: number, warm: boolean): void {
  ctx.fillStyle = warm ? '#7a4f37' : '#3b3446';
  ctx.fillRect(x, 70, 90, 210);
  const colors = warm ? ['#e4572e', '#f3a712', '#29bf12', '#3aa0ff', '#c75dff'] : ['#55607a', '#4a5468', '#5c5370'];
  for (let row = 0; row < 4; row += 1) {
    ctx.fillStyle = warm ? '#5b3a28' : '#2b2735';
    ctx.fillRect(x, 120 + row * 45, 90, 5);
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = colors[(row * 9 + i) % colors.length]!;
      ctx.fillRect(x + 4 + i * 9.5, 84 + row * 45, 7, 34);
    }
  }
}

function arcadeCabinet(ctx: CanvasRenderingContext2D, x: number, t: number, lit: boolean): void {
  ctx.fillStyle = '#20223a';
  ctx.fillRect(x, 95, 90, 185);
  ctx.fillStyle = lit ? `hsl(${(t * 60) % 360} 90% 60%)` : '#3a2d55';
  ctx.fillRect(x + 5, 100, 80, 16);
  ctx.fillStyle = lit ? '#0d3a3f' : '#141826';
  ctx.fillRect(x + 12, 124, 66, 56);
  if (lit) {
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = `hsl(${(t * 90 + i * 60) % 360} 85% 62%)`;
      ctx.fillRect(x + 16 + (i % 3) * 20, 132 + Math.floor(i / 3) * 22, 12, 12);
    }
  }
  ctx.fillStyle = '#2f3352';
  ctx.fillRect(x + 8, 190, 74, 14);
}

/** A friend with head, torso, two arms and two legs. `jump` lifts the body; `armsUp` raises both arms. */
export function friend(ctx: CanvasRenderingContext2D, x: number, ground: number, color: string, opts: { jump?: number; armsUp?: number; wave?: number; scale?: number; alpha?: number } = {}): void {
  const s = opts.scale ?? 1;
  const lift = (opts.jump ?? 0) * 26 * s;
  const head = ground - 104 * s - lift;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fillStyle = '#f0c9a8';
  ctx.beginPath();
  ctx.arc(x, head, 13 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1d22';
  ctx.beginPath();
  ctx.arc(x, head - 4 * s, 13 * s, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - 16 * s, head + 14 * s, 32 * s, 44 * s);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7 * s;
  const up = opts.armsUp ?? 0;
  const wave = opts.wave ?? 0;
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, head + 20 * s);
  ctx.lineTo(x - 26 * s, head + (46 - up * 64) * s);
  ctx.moveTo(x + 14 * s, head + 20 * s);
  ctx.lineTo(x + (26 + wave * 8) * s, head + (46 - up * 64 - wave * 30) * s);
  ctx.stroke();
  ctx.strokeStyle = '#2b2e44';
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, head + 58 * s);
  ctx.lineTo(x - 12 * s, ground - lift);
  ctx.moveTo(x + 8 * s, head + 58 * s);
  ctx.lineTo(x + 12 * s, ground - lift);
  ctx.stroke();
  ctx.restore();
}

function lowerThird(ctx: CanvasRenderingContext2D, title: string, subtitle: string, color: string): void {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.82)';
  ctx.fillRect(22, 250, 260, 56);
  ctx.fillStyle = color;
  ctx.fillRect(22, 250, 6, 56);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(title, 38, 276);
  ctx.fillStyle = '#d8dcef';
  ctx.font = '13px monospace';
  ctx.fillText(subtitle, 38, 296);
}

function cameraFlash(ctx: CanvasRenderingContext2D, p: number, calm: boolean): void {
  if (calm) return;
  const flash = p > 0.4 && p < 0.47 ? 1 - Math.abs(p - 0.435) / 0.035 : 0;
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 252, 235, ${flash * 0.75})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function sparks(ctx: CanvasRenderingContext2D, t: number, calm: boolean): void {
  for (let i = 0; i < (calm ? 10 : 34); i += 1) {
    const a = i * 2.39 + t * 7;
    const r = 20 + ((t * 160 + i * 23) % 120);
    ctx.fillStyle = i % 3 === 0 ? '#fff6a8' : '#ffb02e';
    ctx.fillRect(240 + Math.cos(a) * r, 150 + Math.sin(a) * r * 0.7, 3, 3);
  }
}

function calendar(ctx: CanvasRenderingContext2D, p: number, calm: boolean): void {
  room(ctx, '#3b3550', '#1d1a2a', '#241d27');
  ctx.fillStyle = '#efe4c2';
  ctx.fillRect(150, 60, 180, 200);
  ctx.fillStyle = '#a3302c';
  ctx.fillRect(150, 60, 180, 40);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SEPTEMBER 1998', 240, 87);
  const flipping = !calm && p < 0.45;
  const day = flipping ? 1 + Math.floor(p * 70) % 30 : 31;
  ctx.fillStyle = day === 31 ? '#b3122a' : '#2a1f22';
  ctx.font = 'bold 84px monospace';
  ctx.fillText(String(day).padStart(2, '0'), 240, 200);
  if (flipping) {
    ctx.fillStyle = 'rgba(239, 228, 194, 0.9)';
    ctx.beginPath();
    ctx.moveTo(150, 100);
    ctx.lineTo(330, 100);
    ctx.lineTo(330 - p * 300, 260);
    ctx.lineTo(150, 260);
    ctx.fill();
  } else {
    ctx.fillStyle = '#2a1f22';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('31-09-98', 240, 240);
    ctx.save();
    ctx.translate(352, 210);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#ffe27a';
    ctx.fillRect(-46, -26, 92, 52);
    ctx.fillStyle = '#3a2a12';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('09-31-98', 0, 5);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

function tapeOne(ctx: CanvasRenderingContext2D, t: number, calm: boolean): void {
  const shot = shotIndex(t);
  const p = shotProgress(t);
  const pan = calm ? 0 : (p - 0.5) * 24;
  ctx.save();
  ctx.translate(pan, 0);
  if (shot === 0) {
    room(ctx, '#ffb46a', '#9a4f6b');
    shelves(ctx, 30, true);
    shelves(ctx, 360, true);
    ctx.fillStyle = `rgba(255, 79, 145, ${0.75 + Math.sin(t * 6) * 0.2})`;
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MIDNIGHT RENTALS', 240, 60);
    ctx.textAlign = 'left';
    FRIENDS.forEach((f, i) => friend(ctx, 150 + i * 60, 290, f.color, { wave: Math.sin(t * 5 + i) }));
  } else if (shot >= 1 && shot <= 4) {
    const f = FRIENDS[shot - 1]!;
    room(ctx, '#ffc27d', '#a7586d');
    shelves(ctx, 20, true);
    arcadeCabinet(ctx, 360, t, true);
    const zoom = 1.25 + p * 0.1;
    ctx.save();
    ctx.translate(240, 300);
    ctx.scale(zoom, zoom);
    friend(ctx, 0, 0, f.color, { wave: Math.sin(t * 6), armsUp: shot === 1 ? 0.6 : 0 });
    ctx.restore();
    ctx.restore();
    lowerThird(ctx, f.name, f.role, f.color);
    return;
  } else if (shot === 5 || shot === 6 || shot === 7) {
    room(ctx, '#ffb070', '#8f4a73');
    arcadeCabinet(ctx, 195, t, true);
    const jump = Math.abs(Math.sin(t * (calm ? 2 : 5)));
    if (shot === 5) {
      FRIENDS.forEach((f, i) => friend(ctx, 90 + i * 100, 300, f.color, { jump: jump * (i % 2 ? 1 : 0.6), armsUp: 1 }));
    } else if (shot === 6) {
      friend(ctx, 190, 300, FRIENDS[0]!.color, { armsUp: 0.9, wave: 0.6 });
      friend(ctx, 290, 300, FRIENDS[1]!.color, { armsUp: 0.9, wave: -0.6 });
      friend(ctx, 90, 300, FRIENDS[2]!.color, { jump });
      friend(ctx, 390, 300, FRIENDS[3]!.color, { jump });
      ctx.fillStyle = '#fff3b0';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('HIGH SCORE!', 182, 80);
    } else {
      FRIENDS.forEach((f, i) => friend(ctx, 150 + i * 60, 300, f.color, { armsUp: 0.35, wave: 0 }));
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(135, 225);
      ctx.lineTo(345, 225);
      ctx.stroke();
    }
    ctx.restore();
    cameraFlash(ctx, p, calm);
    return;
  } else if (shot === 8) {
    room(ctx, '#2c2440', '#120e1c');
    arcadeCabinet(ctx, 195, t, Math.sin(t * 40) > 0);
    sparks(ctx, t, calm);
    if (!calm && Math.sin(t * 30) > 0.6) {
      ctx.fillStyle = 'rgba(255, 210, 80, 0.55)';
      ctx.fillRect(0, 0, W, H);
    }
  } else if (shot === 9) {
    ctx.restore();
    calendar(ctx, p, calm);
    return;
  } else {
    const cold = Math.min(1, (shot - 10) / 6);
    room(ctx, `rgb(${Math.round(255 - cold * 170)}, ${Math.round(176 - cold * 90)}, ${Math.round(112 + cold * 60)})`, '#2b2440');
    arcadeCabinet(ctx, 195, t, true);
    FRIENDS.forEach((f, i) => friend(ctx, 90 + i * 100, 300, f.color, { jump: Math.abs(Math.sin(t * 4 + i)) * (1 - cold), armsUp: 0.8 - cold * 0.6, alpha: 1 - cold * 0.6 }));
  }
  ctx.restore();
}

function tapeTwo(ctx: CanvasRenderingContext2D, t: number, calm: boolean): void {
  const shot = shotIndex(t);
  const p = shotProgress(t);
  const storm = shot >= 11;
  room(ctx, storm ? '#3a4a66' : '#ffc98a', storm ? '#141b2b' : '#b66a5a');
  ctx.fillStyle = storm ? '#24324a' : '#ffe4b0';
  ctx.fillRect(310, 50, 140, 120);
  if (storm) {
    for (let i = 0; i < (calm ? 20 : 60); i += 1) {
      const x = 310 + ((i * 37 + t * 300) % 140);
      const y = 50 + ((i * 53 + t * 500) % 120);
      ctx.fillStyle = 'rgba(190, 220, 255, 0.7)';
      ctx.fillRect(x, y, 1, 8);
    }
    if (!calm && p > 0.6 && p < 0.66) {
      ctx.fillStyle = 'rgba(235, 240, 255, 0.85)';
      ctx.fillRect(0, 0, W, H);
    }
  }
  ctx.fillStyle = '#6b3f2c';
  ctx.fillRect(40, 210, 400, 70);
  const maya = FRIENDS[0]!;
  const julian = FRIENDS[3]!;
  const reach = shot % 4 === 1 ? p : shot % 4 === 2 ? 1 : 0.3;
  friend(ctx, 170, 290, maya.color, { armsUp: 0.15 + reach * 0.25, wave: reach * 0.5 });
  friend(ctx, 310 + (shot % 4 === 3 ? -p * 10 : 0), 290, julian.color, { armsUp: 0.1 });
  ctx.fillStyle = '#1c1d28';
  ctx.fillRect(196 + reach * 70, 186, 34, 20);
  ctx.fillStyle = '#f3ead0';
  ctx.fillRect(200 + reach * 70, 190, 26, 8);
  ctx.fillStyle = '#c0392b';
  ctx.font = 'bold 7px monospace';
  ctx.fillText('FOR J.', 202 + reach * 70, 197);
  if (shot === 9) {
    ctx.fillStyle = 'rgba(255, 110, 150, 0.85)';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('♥', 300, 150 - p * 20);
  }
  if (shot <= 1) lowerThird(ctx, 'OCT 30 1998', 'MAYA & JULIAN', maya.color);
}

function confession(ctx: CanvasRenderingContext2D, t: number, calm: boolean, archive: boolean): void {
  const shot = shotIndex(t);
  const p = shotProgress(t);
  room(ctx, archive ? '#4a5670' : '#5a4f6e', '#15161f', '#1b1a24');
  ctx.fillStyle = '#202436';
  ctx.fillRect(180, 120, 150, 110);
  ctx.fillStyle = `rgba(150, 200, 255, ${0.55 + Math.sin(t * 9) * 0.15})`;
  ctx.fillRect(192, 132, 126, 84);
  const julian = FRIENDS[3]!;
  const close = shot % 3 === 1;
  ctx.save();
  if (close) {
    ctx.translate(240, 330);
    ctx.scale(1.6, 1.6);
    ctx.translate(-240, -330);
  }
  friend(ctx, 130, 300, julian.color, { armsUp: 0.1 });
  ctx.restore();
  if (close) {
    ctx.fillStyle = 'rgba(160, 210, 255, 0.9)';
    ctx.fillRect(122, 158 + ((t * 40) % 40), 3, 9);
  }
  if (archive) {
    const minute = Math.min(58, 40 + Math.floor(t / 3));
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`CAM 09  23:${String(minute).padStart(2, '0')}`, 300, 300);
    if (!calm && t > 30 && Math.sin(t * 13) > 0.85) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(0, (t * 90) % H, W, 18);
    }
  }
  if (shot === 0) lowerThird(ctx, 'JULIAN', archive ? 'ARCHIVE 09 · NOV 1998' : 'OCT 31 1998 · 23:58', julian.color);
  if (p > 0.95 && !calm) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, H);
  }
}

/** Draws one frame of the tape's film. Returns false for an unknown tape. */
export function drawStory(ctx: CanvasRenderingContext2D, tapeId: string, t: number, calm: boolean): boolean {
  ctx.save();
  switch (tapeId) {
    case FIRST_TAPE_ID:
      tapeOne(ctx, t, calm);
      break;
    case SECOND_TAPE_ID:
      tapeTwo(ctx, t, calm);
      break;
    case THIRD_TAPE_ID:
      confession(ctx, t, calm, false);
      break;
    case MEMORY_ID:
      confession(ctx, t, calm, true);
      break;
    default:
      ctx.restore();
      return false;
  }
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  return true;
}
