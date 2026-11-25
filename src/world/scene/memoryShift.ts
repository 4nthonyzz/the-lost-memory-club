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

/**
 * Flat colours of the three cabinet screens. They are the no-canvas fallback: with the attract textures
 * attached the base is BASE_ARCADE_SCREEN_COLOR instead (see arcadeScreenBaseColor).
 */
export const ARCADE_SCREEN_BASE_COLORS = Object.freeze({
  snake: '#2bd66b', // phosphor green
  maze: '#8a3ad0', // crimson-violet CRT, violet side
  frequency: '#f0a21e', // amber
})

export type ArcadeScreenGame = keyof typeof ARCADE_SCREEN_BASE_COLORS

/** Colour the shift restores at t = 0: white when the screen shows its texture, the flat game colour otherwise. */
export function arcadeScreenBaseColor(game: ArcadeScreenGame, textured: boolean): string {
  return textured ? BASE_ARCADE_SCREEN_COLOR : ARCADE_SCREEN_BASE_COLORS[game]
}

/**
 * Couch upholstery colours (task 21.1). `flat` is the authored colour without a canvas (the no-texture
 * fallback). `textured` is the multiplier used with the near-neutral couchFabric texture (mean albedo about
 * 0.8), lifted so the lit result reads like the flat colour.
 */
export const COUCH_FABRIC_COLORS = Object.freeze({
  couchBody: { flat: '#7a2c3c', textured: '#98374b' },
  couchCushion: { flat: '#8c3446', textured: '#af4158' },
  couchPillow: { flat: '#26b5c9', textured: '#30e2fb' },
  /**
   * Armchair (task 22.1): `flat` is the previous green armchair colour (no-canvas fallback, unchanged).
   * `textured` is a muted slate/teal (#4f6a70 body, #5f7c80 cushion) lifted about 1.25x like the couch.
   */
  armchairBody: { flat: '#3d5a4c', textured: '#63848c' },
  armchairCushion: { flat: '#4f7561', textured: '#779ba0' },
})

export type CouchMaterialKey = keyof typeof COUCH_FABRIC_COLORS

/** Colour the shift restores at t = 0 for a couch material. */
export function couchBaseColor(key: CouchMaterialKey, textured: boolean): string {
  return textured ? COUCH_FABRIC_COLORS[key].textured : COUCH_FABRIC_COLORS[key].flat
}

/**
 * Colour a couch material reaches at t = 1: the authored colour darkened, desaturated, then nudged toward
 * the shifted accent, so the red couch turns a dull bruised rose and the cyan pillow a dull grey-pink.
 */
export function couchShiftColor(base: string): string {
  const c = parse(base)
  const grey = (c[0] + c[1] + c[2]) / 3
  const dull = c.map((v) => Math.round((v + (grey - v) * 0.45) * 0.55))
  const hex = `#${dull.map((v) => v.toString(16).padStart(2, '0')).join('')}`
  return mixHex(hex, PALETTE_SHIFTED.accent, 0.18)
}

/**
 * Colour the CRT glass shift restores at t = 0 (task 21.2): white when the crtGlass texture is attached
 * (the texture carries the look), the flat teal BASE_CRT_SCREEN_COLOR otherwise.
 */
export function crtScreenBaseColor(textured: boolean): string {
  return textured ? BASE_ARCADE_SCREEN_COLOR : BASE_CRT_SCREEN_COLOR
}

/**
 * CRT television housing colours (task 21.2). `flat` is the no-canvas fallback (charcoal, replacing the old
 * light casing look in fallback mode). `textured` multiplies the near-neutral crtCasing texture (mean
 * albedo about 0.7) to charcoal / warm slate.
 */
export const CRT_CASING_COLORS = Object.freeze({ flat: '#3a393f', textured: '#4d4b55' })

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
  /** Couch upholstery (task 21.1): t = 0 is exactly `baseColor`, t = 1 is `couchShiftColor(baseColor)`. */
  couch?: Array<{ material: { color: ColorLike }; baseColor: string }>
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
  for (const s of targets.couch ?? []) {
    s.material.color.set(mixHex(s.baseColor, couchShiftColor(s.baseColor), k))
  }
  for (const o of targets.overlays) {
    o.material.opacity = overlayOpacity(k, o.maxOpacity)
    o.material.visible = overlayVisible(k)
  }
}
