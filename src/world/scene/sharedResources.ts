/**
 * Shared geometries and materials, created once and reused by every scene
 * component. Materials are fixed: none reads lock state or memoryShifted.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
} from 'three'

export const geometries = {
  /** Unit box; size it with mesh `scale`. */
  box: new BoxGeometry(1, 1, 1),
  /** Unit plane in the XY plane; rotate and scale per use. */
  plane: new PlaneGeometry(1, 1),
  /** Unit-height cylinder of radius 0.5 (lamp base, knobs). */
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 12),
}

const lambert = (color: string) => new MeshLambertMaterial({ color })

export const materials = {
  floor: lambert('#3a3340'),
  wall: lambert('#5a5470'),
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
  /** Fixed emissive screens; independent of any state. */
  crtScreen: new MeshBasicMaterial({ color: '#4fe0d0' }),
  arcadeScreen: new MeshBasicMaterial({ color: '#d84fd0' }),
  led: new MeshBasicMaterial({ color: '#ff4040' }),
}

/** Disposes every shared geometry and material. Call on scene unmount. */
export function disposeSharedResources(): void {
  for (const g of Object.values(geometries)) g.dispose()
  for (const m of Object.values(materials)) m.dispose()
}
