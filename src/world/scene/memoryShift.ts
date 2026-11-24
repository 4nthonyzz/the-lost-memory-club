/**
 * Pure helpers for the Memory_Shift look (M4). No three.js, React or DOM imports:
 * targets are plain structural objects so the blend can be tested in node.
 * The look depends only on the blend progress `t` (0 = original, 1 = shifted).
 */
import {
  AMBIENT_INTENSITY_FLOOR,
  PALETTE_NORMAL,
  PALETTE_SHIFTED,
  blendPalette,
} from '../logic/palette'
import { WALL_TEXTURE_ALBEDO } from './proceduralTextures'

/**
 * Authored colors of the materials that the shift tints.
 * The wall carries a baked panelling texture (task 18.3), so its colour is a near-white multiplier:
 * at t = 0 the wall shows the authored plaster tone, and the blend tints it toward the shifted wall colour.
 */
export const BASE_WALL_COLOR = '#f4f0ff'

/** Multiplier colour that makes the baked wall texture read as `tint` at t = 1 (channels clamped to 255). */
export function wallShiftColor(tint: string = PALETTE_SHIFTED.wallTint): string {
  const c = parse(tint)
  return `#${[0, 1, 2]
    .map((i) =>
      Math.min(255, Math.round(c[i] / WALL_TEXTURE_ALBEDO[i]))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}
export const BASE_CRT_SCREEN_COLOR = '#4fe0d0'
/**
 * The arcade screen carries a texture, so its colour is a multiplier: white shows the authored
 * attract screen unmodified at t = 0, and the blend tints it toward the shifted screen colour.
 */
export const BASE_ARCADE_SCREEN_COLOR = '#ffffff'

/** Share of the shifted light color mixed into each point light at t = 1. */
export const POINT_LIGHT_TINT = 0.6
/** Point light intensity multiplier at t = 1. */
export const POINT_LIGHT_SHIFTED_SCALE = 0.85

export interface ColorLike {
  set(color: string): unknown
}

export interface ShiftTargets {
  background: ColorLike | null
  fog: { color: ColorLike; near: number; far: number } | null
  ambient: { color: ColorLike; intensity: number } | null
  points: Array<{
    light: { color: ColorLike; intensity: number }
    baseColor: string
    baseIntensity: number
  }>
  wall: { color: ColorLike }
  screens: Array<{ material: { color: ColorLike }; baseColor: string }>
  overlays: Array<{ material: { opacity: number; visible: boolean }; maxOpacity: number }>
}

function clamp01(v: number): number {
  return !Number.isFinite(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v
}

function parse(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Linear mix of two hex colors in sRGB space. */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t)
  const ca = parse(a)
  const cb = parse(b)
  const part = (i: number) =>
    Math.round(ca[i] + (cb[i] - ca[i]) * k)
      .toString(16)
      .padStart(2, '0')
  return `#${part(0)}${part(1)}${part(2)}`
}

/** Overlay (poster, plaque) opacity: fades in with t. */
export function overlayOpacity(t: number, maxOpacity = 1): number {
  return clamp01(t) * maxOpacity
}

/** Overlays are hidden entirely at t = 0 so they cost nothing in the normal state. */
export function overlayVisible(t: number): boolean {
  return clamp01(t) > 0
}

/** Writes the look for progress `t` into the targets. Ambient intensity never drops below the floor. */
export function applyShift(t: number, targets: ShiftTargets): void {
  const k = clamp01(t)
  const p = blendPalette(PALETTE_NORMAL, PALETTE_SHIFTED, k)

  targets.background?.set(p.background)
  if (targets.fog) {
    targets.fog.color.set(p.fogColor)
    targets.fog.near = p.fogNear
    targets.fog.far = p.fogFar
  }
  if (targets.ambient) {
    targets.ambient.color.set(p.ambient)
    targets.ambient.intensity = Math.max(AMBIENT_INTENSITY_FLOOR, p.ambientIntensity)
  }
  for (const pt of targets.points) {
    pt.light.color.set(mixHex(pt.baseColor, PALETTE_SHIFTED.lightColor, k * POINT_LIGHT_TINT))
    pt.light.intensity = pt.baseIntensity * (1 + (POINT_LIGHT_SHIFTED_SCALE - 1) * k)
  }
  targets.wall.color.set(mixHex(BASE_WALL_COLOR, wallShiftColor(), k))
  for (const s of targets.screens) {
    s.material.color.set(mixHex(s.baseColor, PALETTE_SHIFTED.screenEmissive, k))
  }
  for (const o of targets.overlays) {
    o.material.opacity = overlayOpacity(k, o.maxOpacity)
    o.material.visible = overlayVisible(k)
  }
}
