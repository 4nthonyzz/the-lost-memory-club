/**
 * Shared geometries and materials, created once and reused by every scene
 * component. No material reads lock state or memoryShifted; the Memory_Shift
 * driver mutates wall, screen and overlay materials from the blend progress.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three'
import { BASE_ARCADE_SCREEN_COLOR, BASE_CRT_SCREEN_COLOR, BASE_WALL_COLOR } from './memoryShift'

export const geometries = {
  /** Unit box; size it with mesh `scale`. */
  box: new BoxGeometry(1, 1, 1),
  /** Unit plane in the XY plane; rotate and scale per use. */
  plane: new PlaneGeometry(1, 1),
  /** Unit-height cylinder of radius 0.5 (lamp base, knobs). */
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 12),
  /** Low-segment cylinder (8 sides) for small parts: knobs, posts, antenna rods. */
  cylinderLow: new CylinderGeometry(0.5, 0.5, 1, 8),
  /** Low-segment sphere (8 x 6) of diameter 1: joystick ball, bulb, bell. */
  sphere: new SphereGeometry(0.5, 8, 6),
}

const lambert = (color: string) => new MeshLambertMaterial({ color })

/** Hidden by default (opacity 0, invisible); the Memory_Shift driver fades them in. Visual only. */
const overlay = (color: string) =>
  new MeshBasicMaterial({ color, transparent: true, opacity: 0, visible: false, depthWrite: false })

export const materials = {
  floor: lambert('#3a3340'),
  wall: lambert(BASE_WALL_COLOR),
  ceiling: lambert('#2c2838'),
  wood: lambert('#6b4a30'),
  woodDark: lambert('#4a3220'),
  metal: lambert('#777c86'),
  plastic: lambert('#22232a'),
  crate: lambert('#8a6a3c'),
  rug: lambert('#7a2c3c'),
  poster: lambert('#c9a84a'),
  posterAccent: lambert('#2e8c8c'),
  doorFrame: lambert('#3b2a1d'),
  tapeBlack: lambert('#15151a'),
  tapeLabel: lambert('#d8d2b8'),
  cabinet: lambert('#5a1f7a'),
  lampShade: lambert('#e8c27a'),
  /** 13.6 detail materials. All fixed colours, none reads game state. */
  casing: lambert('#8d887a'),
  casingDark: lambert('#5f5b52'),
  bezel: lambert('#0c0c10'),
  displayGreen: new MeshBasicMaterial({ color: '#2a8a5a' }),
  /** Fixed lit arcade marquee. */
  marquee: new MeshBasicMaterial({ color: '#f5a623' }),
  sideArtA: lambert('#d9347a'),
  sideArtB: lambert('#26b5c9'),
  btnRed: lambert('#d62a2a'),
  btnYellow: lambert('#e8c42a'),
  btnGreen: lambert('#2aa84a'),
  btnBlue: lambert('#2a5ad6'),
  btnWhite: lambert('#e8e8ec'),
  btnOrange: lambert('#e87a2a'),
  bulb: new MeshBasicMaterial({ color: '#fff2c0' }),
  fluorescent: new MeshBasicMaterial({ color: '#e8f4ff' }),
  trim: lambert('#2a2230'),
  skirting: lambert('#1f1a26'),
  fabric: lambert('#3d5a4c'),
  fabricLight: lambert('#4f7561'),
  rugLight: lambert('#8c3446'),
  rugWorn: lambert('#55202e'),
  crateSlat: lambert('#6e5230'),
  spineA: lambert('#a02a2a'),
  spineB: lambert('#2a4aa0'),
  spineC: lambert('#c9a02a'),
  /** White base so per-instance colours show true. Used by the shelf tape InstancedMeshes. */
  tapeSpine: lambert('#ffffff'),
  /** Screens: tinted only by the Memory_Shift blend. They never read lock state. */
  crtScreen: new MeshBasicMaterial({ color: BASE_CRT_SCREEN_COLOR }),
  arcadeScreen: new MeshBasicMaterial({ color: BASE_ARCADE_SCREEN_COLOR }),
  led: new MeshBasicMaterial({ color: '#ff4040' }),
  /** Memory_Shift set dressing, faded by opacity. */
  shiftPoster: overlay('#8a1c2e'),
  shiftPosterAccent: overlay('#f0c0c8'),
  shiftPlaque: overlay('#2a0a14'),
  shiftPlaqueText: overlay('#ff7f9a'),
}

/** Overlay materials with their full opacity, in the order the driver fades them. */
export const overlayMaterials = [
  { material: materials.shiftPoster, maxOpacity: 0.95 },
  { material: materials.shiftPosterAccent, maxOpacity: 0.9 },
  { material: materials.shiftPlaque, maxOpacity: 0.95 },
  { material: materials.shiftPlaqueText, maxOpacity: 0.9 },
]

/** Disposes every shared geometry and material. Call on scene unmount. */
export function disposeSharedResources(): void {
  for (const g of Object.values(geometries)) g.dispose()
  for (const m of Object.values(materials)) m.dispose()
}
