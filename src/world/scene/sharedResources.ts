/**
 * Shared geometries and materials, created once and reused by every scene
 * component. No material reads lock state or memoryShifted; the Memory_Shift
 * driver mutates wall, screen and overlay materials from the blend progress.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  ClampToEdgeWrapping,
  CylinderGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
} from 'three'
import { ROOM } from '../layout/roomLayout'
import { ARCADE_SCREEN_BASE_COLORS, BASE_CRT_SCREEN_COLOR, BASE_WALL_COLOR, COUCH_FABRIC_COLORS, CRT_CASING_COLORS, arcadeScreenBaseColor, crtScreenBaseColor } from './memoryShift'
import {
  ATTRACT_FRAME_DRAWERS,
  ATTRACT_TEXTURE_IDS,
  BOX_FACE_FRONT,
  FLOOR_METRES_PER_REPEAT,
  SPINE_CASE_SIDE_CELL,
  SPINE_COVER_CELL,
  SPINE_VARIANT_COUNT,
  TEXTURE_IDS,
  TEXTURE_SPECS,
  CABINET_DETAIL_REGIONS,
  MANUAL_STRIP_KEYS,
  VCR_CHASSIS_COLOR,
  WALL_METRES_U,
  WALL_METRES_V,
  type Ctx2D,
  type TextureFilter,
  type UvRect,
  detailUvRect,
  spineCellUv,
  type TextureId,
} from './proceduralTextures'

/** Radial segments of every round lamp glow surface and light cone (task 30.1). */
const LAMP_RADIAL_SEGMENTS = 24

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
  /** Open-ended truncated cone (task 23.1): bottom diameter 1, top diameter 0.6, 12 sides, no caps. Table-lamp shade. */
  cone: new CylinderGeometry(0.3, 0.5, 1, 12, 1, true),
  /** Open square tube (task 25.1): 4 radial segments turned 45 degrees at radius sqrt(1/2), so the section is exactly 1 x 1 (scale = real size). 8 triangles. */
  collar: new CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1, true, Math.PI / 4),
  /**
   * Unit disc (task 30.1): diameter 1, 24 radial segments (24 triangles), facing +z with UVs inscribed in the unit square like the plane.
   * Every glow-like lamp surface (halo sprite, desk pool, inner shade glow) uses it, so no glow ever has square corners.
   */
  disc: new CircleGeometry(0.5, LAMP_RADIAL_SEGMENTS),
  /**
   * Open light cone of a desk lamp (task 30.1): bottom diameter 1, top diameter 0.5, 24 radial segments, no caps (48 triangles).
   * Scale uniformly by 4 x the wanted top radius.
   */
  lampCone: new CylinderGeometry(0.25, 0.5, 1, LAMP_RADIAL_SEGMENTS, 1, true),
}

/**
 * Unit box per spine variant (task 18.2) with remapped UVs: the +Z face (the spine) shows the variant's atlas
 * cell, every other face shows the cover cell (books) or the plastic side cell (slipcases). One InstancedMesh
 * per variant keeps the shared geometry, so draw calls stay at one per variant per bookcase.
 */
function makeSpineGeometry(variant: number): BoxGeometry {
  const g = new BoxGeometry(1, 1, 1)
  const uv = g.getAttribute('uv')
  const side = spineCellUv(variant < 3 ? SPINE_COVER_CELL : SPINE_CASE_SIDE_CELL)
  const spine = spineCellUv(variant)
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z, four vertices each, local uv in 0..1.
  for (let i = 0; i < uv.count; i++) {
    const r = Math.floor(i / 4) === 4 ? spine : side
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0))
  }
  uv.needsUpdate = true
  return g
}

export const spineGeometries: readonly BoxGeometry[] = Array.from({ length: SPINE_VARIANT_COUNT }, (_, v) => makeSpineGeometry(v))

/**
 * Remaps the native UVs of a box (task 27.1): the faces in `faces` show the whole of `rect`, every other face shows
 * the flat `plain` rect. The native orientation is kept (on +z, u follows +x and v follows +y), so text reads upright
 * from the front. `g` must be a fresh BoxGeometry.
 */
function remapBoxUv(g: BoxGeometry, rect: UvRect, faces: readonly number[], plain: UvRect): BoxGeometry {
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    const r = faces.includes(Math.floor(i / 4)) ? rect : plain
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0))
  }
  uv.needsUpdate = true
  return g
}

/**
 * Unit box per arcade manual (tasks 27.1 and 28.2), in MANUAL_STRIP_KEYS order: the +z face (the spine, which faces +X toward the room
 * on the west bookcase) shows the manual's own spine strip of cabinetAndManualDetail, the two side faces (+x and -x of the box, which
 * are the exposed covers once the book protrudes) show its cover panel, and the top, bottom and back (-z) show its plain cloth stripe.
 * One box (12 triangles) per manual, sized by instance scale like the spine variants.
 */
function manualBoxGeometry(strip: UvRect, cover: UvRect, plain: UvRect): BoxGeometry {
  const g = new BoxGeometry(1, 1, 1)
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4)
    const r = face === BOX_FACE_FRONT ? strip : face === 0 || face === 1 ? cover : plain
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0))
  }
  uv.needsUpdate = true
  return g
}

export const manualGeometries: Readonly<Record<(typeof MANUAL_STRIP_KEYS)[number], BoxGeometry>> = Object.freeze(
  Object.fromEntries(
    MANUAL_STRIP_KEYS.map((id, i) => [
      id,
      manualBoxGeometry(detailUvRect(CABINET_DETAIL_REGIONS.strips[i]), detailUvRect(CABINET_DETAIL_REGIONS.covers[i]), detailUvRect(CABINET_DETAIL_REGIONS.plains[i])),
    ]),
  ),
) as Record<(typeof MANUAL_STRIP_KEYS)[number], BoxGeometry>

const lambert = (color: string) => new MeshLambertMaterial({ color })

/** Hidden by default (opacity 0, invisible); the Memory_Shift driver fades them in. Visual only. */
const overlay = (color: string) =>
  new MeshBasicMaterial({ color, transparent: true, opacity: 0, visible: false, depthWrite: false })

/** Task 25.2: additive floor glow, opacity 0.26, no depth write, pulled toward the camera by a polygon offset. */
export const ARCADE_GLOW_OPACITY = 0.26
const arcadeGlowMaterial = (color: string) =>
  new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: ARCADE_GLOW_OPACITY,
    blending: AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })

export const materials = {
  floor: lambert('#3a3340'),
  wall: lambert(BASE_WALL_COLOR),
  ceiling: lambert('#2c2838'),
  wood: lambert('#6b4a30'),
  woodDark: lambert('#4a3220'),
  metal: lambert('#777c86'),
  plastic: lambert('#22232a'),
  /** Cardboard-box look (task 22.2): flat brown is the no-canvas fallback; with the crate texture the multiplier is white. Used by the desk archive box and the crate label panels. */
  crate: lambert('#8a6a3c'),
  /** Wooden crate rings and shelf boxes (task 22.2): the old crate colour on the wood texture, since `crate` is cardboard now. */
  crateWood: lambert('#8a6a3c'),
  rug: lambert('#7a2c3c'),
  /** Framed posters. Flat colours are the fallback; the poster textures replace them. */
  posterSunset: lambert('#8a2a6a'),
  posterReel: lambert('#0c3a44'),
  doorFrame: lambert('#3b2a1d'),
  /** VHS cassettes. Flat colours are the no-canvas fallback; with the vhsShell texture the multiplier is a lifted tone of the same hue (task 22.1). */
  tapeBlack: lambert('#15151a'),
  tapeBlue: lambert('#2a4aa0'),
  tapeLabel: lambert('#d8d2b8'),
  cabinet: lambert('#5a1f7a'),
  /** 13.6 detail materials. All fixed colours, none reads game state. */
  casingDark: lambert('#5f5b52'),
  bezel: lambert('#0c0c10'),
  displayGreen: new MeshBasicMaterial({ color: '#2a8a5a' }),
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
  /** 22.1 armchair upholstery. Flat colours are the previous green armchair; with couchFabric the slate/teal multiplier applies. Tinted by Memory_Shift. */
  armchairBody: lambert(COUCH_FABRIC_COLORS.armchairBody.flat),
  armchairCushion: lambert(COUCH_FABRIC_COLORS.armchairCushion.flat),
  /** 22.1 VCR housing: brushed dark metal texture; flat charcoal-slate fallback (26.1: #2b303a, also the texture base colour). */
  vcrDeck: lambert(VCR_CHASSIS_COLOR),
  rugLight: lambert('#8c3446'),
  /** 21.1 couch upholstery. Flat colours are the no-canvas fallback; with the couchFabric texture the multiplier is the textured hue. Tinted by Memory_Shift. */
  couchBody: lambert(COUCH_FABRIC_COLORS.couchBody.flat),
  couchCushion: lambert(COUCH_FABRIC_COLORS.couchCushion.flat),
  couchPillow: lambert(COUCH_FABRIC_COLORS.couchPillow.flat),
  /** 21.2 CRT television housing (dedicated: `casing` is shared with other objects). Flat charcoal is the no-canvas fallback. */
  crtCasing: lambert(CRT_CASING_COLORS.flat),
  crateSlat: lambert('#6e5230'),
  spineA: lambert('#a02a2a'),
  spineB: lambert('#2a4aa0'),
  spineC: lambert('#c9a02a'),
  /** White base: the spine atlas (when available) is multiplied by each book's instance colour. Used by the bookcase InstancedMeshes. */
  bookSpine: lambert('#ffffff'),
  /** 15.6 Arcade_Area dressing. Fixed colours. Sign face and lettering are emissive basic materials, not lights. */
  signBack: lambert('#1a1020'),
  signGlow: new MeshBasicMaterial({ color: '#2a0e2e' }),
  signText: new MeshBasicMaterial({ color: '#ffb347' }),
  /** 15.7: textured sign face (emissive basic material, not a light) and other new detail materials. */
  signFace: new MeshBasicMaterial({ color: '#2a0e2e' }),
  grille: lambert('#1c1d24'),
  coinGlow: new MeshBasicMaterial({ color: '#ffcf5a' }),
  mug: lambert('#b4503c'),
  /** Notepad page block (22.2 part B): shows the ruled-paper cell of deskDetail; flat paper colour is the no-canvas fallback. */
  paper: lambert('#e6dfc6'),
  /** Notepad cover (22.2 part B): the grain cell of deskDetail times this colour; flat colour is the fallback. */
  notebookCover: lambert('#4a5866'),
  /** Lighter ceramic rim ring of the desk mug (22.2 part B); 26.1: a brighter glaze highlight. */
  mugRim: lambert('#f2b8a4'),
  /** 26.1 coffee surface inside the mug rim, and a translucent coffee ring stain on the desk top beside the mug. */
  coffee: lambert('#2a170d'),
  coffeeStain: new MeshLambertMaterial({ color: '#3a2112', transparent: true, opacity: 0.6, depthWrite: false }),
  /** Powered-down screen and marquee of the companion cabinet and the CRT stack. */
  screenOff: lambert('#050508'),
  marqueeOff: lambert('#2a2018'),
  runner: lambert('#4a2a6a'),
  /** 18.1 north-wall focal zone placeholders: grey metal filing cabinets and a cork board. */
  filingGrey: lambert('#6f7782'),
  filingDark: lambert('#59606b'),
  /** 18.3: the second cabinet is a slightly warmer, greener grey. Label slots are bright metal. */
  filingGreyB: lambert('#7a7d70'),
  filingDarkB: lambert('#656858'),
  /** 22.2 typed index card on each drawer: the flat colour of tapeLabel; with metalCabinet it shows the card cell. */
  filingCard: lambert('#d8d2b8'),
  labelSlot: lambert('#d4d8de'),
  /** Cork board: the cork texture (white multiplier) replaces the flat colour when a canvas exists. */
  cork: lambert('#9a7448'),
  /** Woven rug decal. A separate material from `rug`, which colours the couch. */
  rugWoven: lambert('#7a2c3c'),
  /** Overhead conduit pipes and clamps, junction box cover. */
  conduit: lambert('#6b6e76'),
  /** Archival cardboard boxes and their packing tape. */
  cardboard: lambert('#a98457'),
  cardboardDark: lambert('#7e603a'),
  /**
   * Desk lamps (task 23.1). Nothing here is a light. Lit and unlit states are separate materials that are
   * swapped per mesh, so one lamp's state never touches the other (`bulb` above is the lit bulb core).
   */
  brass: lambert('#a8802f'),
  /** 24.1 banker shade: OFF is dark green glass with no emission; ON adds emissive #16a34a at 0.38 (25.1). Separate per lamp, swapped per mesh. */
  lampGreenShade: new MeshLambertMaterial({ color: '#16503a', emissive: '#16a34a', emissiveIntensity: 0 }),
  lampGreenShadeOn: new MeshLambertMaterial({ color: '#1f7a4e', emissive: '#16a34a', emissiveIntensity: 0.38 }),
  /** 27.1, 28.2: arcade manuals. White base and white instance colour: the cabinetAndManualDetail spine, cover and cloth pixels carry the exact manual colours (#16a34a, #e11d48, #f59e0b). */
  manualBook: lambert('#ffffff'),
  /** 27.1: coin door and kick plate of the arcade cabinets (steel, lit like the old `metal` #777c86). The texture is the colour, so the multiplier is white; the flat grey is the no-canvas fallback. */
  cabinetPanel: lambert('#777c86'),
  /** 24.1 table-lamp shade: OFF is a dull grey-cream with no emission; ON adds emissive #ffd27d at 0.85. */
  lampCreamShade: new MeshLambertMaterial({ color: '#a89f8a', emissive: '#ffd27d', emissiveIntensity: 0, side: DoubleSide }),
  lampCreamShadeOn: new MeshLambertMaterial({ color: '#efe3c4', emissive: '#ffd27d', emissiveIntensity: 0.85, side: DoubleSide }),
  lampBulbOff: lambert('#46443f'),
  lampInnerOn: new MeshBasicMaterial({ color: '#ffc272', side: DoubleSide }),
  lampInnerOff: new MeshLambertMaterial({ color: '#2a2824', side: DoubleSide }),
  /** Light pool decal on the desk top (table lamp, warm tungsten amber): additive lampGlow, pulled toward the camera by a polygon offset. */
  lampPool: new MeshBasicMaterial({
    color: '#ffa63c',
    transparent: true,
    opacity: 0.42,
    blending: AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }),
  /** Same decal for the banker's lamp, emerald-gold. A separate material so the two lamps never share state. */
  lampPoolBanker: new MeshBasicMaterial({
    color: '#a6d65a',
    transparent: true,
    opacity: 0.42,
    blending: AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }),
  /** Translucent volumetric light cones from each shade rim to the desk top (24.1): additive, no depth write, both faces. */
  lampConeBanker: new MeshBasicMaterial({
    color: '#8fd65a',
    transparent: true,
    opacity: 0.2,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  }),
  lampConeTable: new MeshBasicMaterial({
    color: '#ffa63c',
    transparent: true,
    opacity: 0.2,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  }),
  /** Faint cool-white additive bloom strip under each ceiling fluorescent tube (24.1), lampGlow map when a canvas exists. */
  ceilingBloom: new MeshBasicMaterial({
    color: '#cfe4ff',
    transparent: true,
    opacity: 0.16,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  }),
  /** 25.2 arcade floor glow decals (one per cabinet): subtle additive lampGlow tinted with the cabinet colour. Static, no collider. */
  arcadeGlowSnake: arcadeGlowMaterial('#22c55e'),
  arcadeGlowMaze: arcadeGlowMaterial('#e11d48'),
  arcadeGlowFrequency: arcadeGlowMaterial('#f59e0b'),
  /** Swapped in for the glow sprite and the pool when a lamp is off: never drawn. */
  /** 25.1 banker hood liner: warm-white inner bulb glow on the underside of the green hood (separate lit/unlit pair). */
  lampLinerOn: new MeshBasicMaterial({ color: '#fff1cc', side: DoubleSide }),
  lampLinerOff: new MeshLambertMaterial({ color: '#1c1b18', side: DoubleSide }),
  lampGlowOff: new MeshBasicMaterial({ transparent: true, opacity: 0, visible: false, depthWrite: false }),
  /** Camera-facing glow sprite of a lit lamp: additive lampGlow. */
  lampHalo: new MeshBasicMaterial({
    color: '#ffb060',
    transparent: true,
    opacity: 0.55,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  }),
  /** Screens: tinted only by the Memory_Shift blend. They never read lock state. */
  crtScreen: new MeshBasicMaterial({ color: BASE_CRT_SCREEN_COLOR }),
  /** Per-cabinet screens: flat game colours are the no-canvas fallback; with a canvas the attract texture is attached and the base becomes white. Tinted by Memory_Shift. */
  arcadeScreenSnake: new MeshBasicMaterial({ color: ARCADE_SCREEN_BASE_COLORS.snake }),
  arcadeScreenMaze: new MeshBasicMaterial({ color: ARCADE_SCREEN_BASE_COLORS.maze }),
  arcadeScreenFrequency: new MeshBasicMaterial({ color: ARCADE_SCREEN_BASE_COLORS.frequency }),
  /** Per-cabinet lit marquees (flat colour fallback, marquee texture when a canvas exists) and coloured side T-molding. */
  marqueeSnake: new MeshBasicMaterial({ color: '#1fa855' }),
  marqueeMaze: new MeshBasicMaterial({ color: '#c8203c' }),
  marqueeFrequency: new MeshBasicMaterial({ color: '#16b8d4' }),
  moldingSnake: new MeshBasicMaterial({ color: '#22c55e' }),
  moldingMaze: new MeshBasicMaterial({ color: '#dc143c' }),
  moldingFrequency: new MeshBasicMaterial({ color: '#ffb000' }),
  /** Plain dark control deck panel (the old deck texture marked a single joystick, so 3D parts carry the detail now). */
  deckPlate: lambert('#1a1b22'),
  led: new MeshBasicMaterial({ color: '#ff4040' }),
  /**
   * 19.2: fixed-colour detail screens. None of them is tinted by Memory_Shift (that driver only owns
   * crtScreen and arcadeScreen). The reference monitor card is dimmed so it never outshines the main CRT.
   * Flat colours are the fallback when no canvas exists.
   */
  smpteScreen: new MeshBasicMaterial({ color: '#3c4650' }),
  timecode: new MeshBasicMaterial({ color: '#2a8a5a' }),
  /** Brushed-metal tape slot flap and frame rails on the VCR. */
  tapeSlotMetal: new MeshStandardMaterial({ color: '#9aa0aa', metalness: 0.7, roughness: 0.35 }),
  cableBlack: lambert('#101014'),
  cableGrey: lambert('#5a5d66'),
  cableRed: lambert('#a02020'),
  /** Memory_Shift set dressing, faded by opacity. */
  shiftPoster: overlay('#8a1c2e'),
  shiftPlaque: overlay('#2a0a14'),
}

/** Overlay materials with their full opacity, in the order the driver fades them. */
export const overlayMaterials = [
  { material: materials.shiftPoster, maxOpacity: 0.95 },
  { material: materials.shiftPlaque, maxOpacity: 0.95 },
]

/**
 * Wall boxes with metric UVs (task 18.3): the wall texture repeats every WALL_METRES_U metres along the wall
 * and once per WALL_METRES_V metres of height, so the wainscot panels keep their size on every wall length.
 * UVs follow world coordinates, so neighbouring wall boxes line up. Cached by footprint, disposed once.
 */
const wallGeometryCache = new Map<string, BoxGeometry>()

export function wallGeometry(box: { minX: number; maxX: number; minZ: number; maxZ: number }, height: number): BoxGeometry {
  const key = `${box.minX},${box.maxX},${box.minZ},${box.maxZ},${height}`
  const cached = wallGeometryCache.get(key)
  if (cached) return cached
  const cx = (box.minX + box.maxX) / 2
  const cz = (box.minZ + box.maxZ) / 2
  const g = new BoxGeometry(box.maxX - box.minX, height, box.maxZ - box.minZ)
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) {
    const wx = pos.getX(i) + cx
    const wy = pos.getY(i) + height / 2
    const wz = pos.getZ(i) + cz
    // Face order: +x, -x, +y, -y, +z, -z.
    const face = Math.floor(i / 4)
    if (face < 2) uv.setXY(i, wz / WALL_METRES_U, wy / WALL_METRES_V)
    else if (face < 4) uv.setXY(i, wx / WALL_METRES_U, wz / WALL_METRES_V)
    else uv.setXY(i, wx / WALL_METRES_U, wy / WALL_METRES_V)
  }
  uv.needsUpdate = true
  wallGeometryCache.set(key, g)
  return g
}

/**
 * Wood boards with metric UVs (task 19.2). The wood texture repeats once per WOOD_METRES_PER_REPEAT metres,
 * so the grain keeps its scale on long boards instead of stretching over one face. The texture's grain runs
 * along its u axis, so on every face u follows the longer of the face's two in-plane edges: the grain runs
 * along the board's longest axis, and an end cap uses the longer of its own two edges.
 * Geometries are real-size boxes (the part's mesh scale is 1), cached by dimensions rounded to 0.1 mm so
 * equal boards share one geometry and one instanced draw. Disposed once by disposeSharedResources().
 */
export const WOOD_METRES_PER_REPEAT = 0.6
const woodBoxCache = new Map<string, BoxGeometry>()

const round4 = (v: number) => Math.round(v * 1e4) / 1e4

/**
 * Real-size box with metric UVs (task 21.1 generalises the wood board geometry): the texture repeats once per
 * `metresPerRepeat` metres on every face. With `alignGrain` u follows the longer in-plane edge (wood grain);
 * otherwise u is the first in-plane axis and v the second, which keeps vertical ribs vertical on the sides
 * (+-x faces: u = z, v = y; +-z faces: u = x, v = y; +-y faces: u = x, v = z). One cache, one disposal.
 * `aspect` (task 22.1) is the tile height over its width in metres, for a non-square texture such as the
 * 256 x 128 vcrDeck (aspect 0.5); it only applies to the plain (non-grain) mapping. Default 1.
 */
export function metricBoxGeometry(
  w: number,
  h: number,
  d: number,
  metresPerRepeat: number,
  alignGrain = false,
  aspect = 1,
  uvOffset?: readonly [number, number],
  plainV?: readonly [number, number],
): BoxGeometry {
  const sx = round4(w)
  const sy = round4(h)
  const sz = round4(d)
  const kind = uvOffset ? 'panel' : alignGrain ? 'grain' : 'plain'
  const aKey = aspect === 1 ? '' : `|a${aspect}`
  const oKey = uvOffset ? `|o${uvOffset[0]},${uvOffset[1]}` : ''
  const pKey = plainV ? `|p${plainV[0]},${plainV[1]}` : ''
  const key = `${kind}|${metresPerRepeat}|${sx},${sy},${sz}${aKey}${oKey}${pKey}`
  const cached = woodBoxCache.get(key)
  if (cached) return cached
  const g = new BoxGeometry(sx, sy, sz)
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  const size = [sx, sy, sz] as const
  // Face order: +x, -x, +y, -y, +z, -z. In-plane axes (a, b) of each face as indices into x, y, z.
  const axes = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]] as const
  for (let i = 0; i < uv.count; i++) {
    const [a, b] = axes[Math.floor(i / 4)]
    const pa = [pos.getX(i), pos.getY(i), pos.getZ(i)][a] + size[a] / 2
    const pb = [pos.getX(i), pos.getY(i), pos.getZ(i)][b] + size[b] / 2
    if (uvOffset && plainV && Math.floor(i / 4) < 4) {
      // Panel mode (task 22.2): only the +-z faces show the tile at the part's offset; every other face shows the plain stripe.
      uv.setXY(i, pa / metresPerRepeat, plainV[0] + (pb / size[b]) * (plainV[1] - plainV[0]))
    } else if (uvOffset) uv.setXY(i, (pa + uvOffset[0]) / metresPerRepeat, (pb + uvOffset[1]) / (metresPerRepeat * aspect))
    else if (alignGrain && size[b] > size[a]) uv.setXY(i, pb / metresPerRepeat, pa / metresPerRepeat)
    else uv.setXY(i, pa / metresPerRepeat, pb / (metresPerRepeat * aspect))
  }
  uv.needsUpdate = true
  woodBoxCache.set(key, g)
  return g
}

export const woodBoxGeometry = (w: number, h: number, d: number): BoxGeometry => metricBoxGeometry(w, h, d, WOOD_METRES_PER_REPEAT, true)

/**
 * Real-size box whose `faces` show a UV window of an atlas texture and whose other faces show a flat `plain` stripe (task 27.1).
 * Used by the arcade cabinet coin door, kick plate and control deck, so the legends live only on the player-facing +z face.
 * Cached by dimensions (0.1 mm) + window + faces, in the same cache as the metric boxes, so disposeSharedResources() disposes it once.
 */
export function atlasBoxGeometry(w: number, h: number, d: number, rect: UvRect, faces: readonly number[], plain: UvRect): BoxGeometry {
  const sx = round4(w)
  const sy = round4(h)
  const sz = round4(d)
  const r = (u: UvRect) => `${u.u0.toFixed(5)},${u.u1.toFixed(5)},${u.v0.toFixed(5)},${u.v1.toFixed(5)}`
  const key = `atlas|${sx},${sy},${sz}|f${faces.join('.')}|${r(rect)}|${r(plain)}`
  const cached = woodBoxCache.get(key)
  if (cached) return cached
  const g = remapBoxUv(new BoxGeometry(sx, sy, sz), rect, faces, plain)
  woodBoxCache.set(key, g)
  return g
}

/** Number of live cached atlas-window box geometries (tests and reports). */
export const atlasBoxCount = (): number => [...woodBoxCache.keys()].filter((k) => k.startsWith('atlas|')).length

/** Number of live cached wood geometries (tests and reports). */
export const woodBoxCount = (): number => [...woodBoxCache.keys()].filter((k) => k.startsWith('grain|')).length

/** Number of live cached upholstery (non-grain) metric geometries. */
export const fabricBoxCount = (): number => [...woodBoxCache.keys()].filter((k) => k.startsWith('plain|')).length

// ---------------------------------------------------------------------------------------------
// Procedural canvas textures (task 15.7, 18.3, 19.2). Deterministic and drawn once, except the three attract screens, which are redrawn in place at most 12 times per second (task 29.2, updateAnimatedAttractTextures).
// Budget: 30 textures (see proceduralTextures.ts for the estimate), limit 8 MB.
// ---------------------------------------------------------------------------------------------

/** The part of a canvas element that createCanvasTexture needs. */
export interface CanvasLike {
  width: number
  height: number
  getContext(type: '2d'): Ctx2D | null
}

export type CanvasFactory = () => CanvasLike | null

/** Returns null outside a browser or in jsdom (no canvas support), so materials keep their flat colours. */
const defaultCanvasFactory: CanvasFactory = () => {
  if (typeof document === 'undefined') return null
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null
  return document.createElement('canvas') as unknown as CanvasLike
}

let canvasFactory: CanvasFactory = defaultCanvasFactory
/** Every texture created and not yet disposed, in creation order. */
const registry: CanvasTexture[] = []
const cache = new Map<TextureId, CanvasTexture | null>()

/** Anisotropic filtering level of every procedural CanvasTexture (task 26.1). */
export const TEXTURE_ANISOTROPY = 4

export interface CanvasTextureOptions {
  filter?: TextureFilter
  wrap?: 'clamp' | 'repeat'
  repeat?: readonly [number, number]
}

/**
 * Draws once on a canvas and wraps it in a CanvasTexture (sRGB, needsUpdate once). Returns null when no
 * canvas or no 2D context is available. The texture is registered for disposeSharedResources().
 */
export function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: Ctx2D, w: number, h: number) => void,
  options: CanvasTextureOptions = {},
): CanvasTexture | null {
  const canvas = canvasFactory()
  if (!canvas) return null
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  draw(ctx, width, height)
  const tex = new CanvasTexture(canvas as unknown as HTMLCanvasElement)
  tex.colorSpace = SRGBColorSpace
  if (options.filter === 'linear') {
    // Smooth, no mipmaps (task 25.1): soft gradients such as the lamp cone falloff.
    tex.generateMipmaps = false
    tex.minFilter = LinearFilter
    tex.magFilter = LinearFilter
  } else if ((options.filter ?? 'mipmap') === 'nearest') {
    tex.generateMipmaps = false
    tex.minFilter = NearestFilter
    tex.magFilter = NearestFilter
  } else {
    tex.generateMipmaps = true
    tex.minFilter = LinearMipmapLinearFilter
    tex.magFilter = LinearFilter
  }
  // Task 26.1: anisotropy 4 on every procedural texture, set in this one place. It sharpens mipmapped surfaces seen at grazing
  // angles (floor, wall, wood). For nearest-filtered or non-mipmapped pixel-art textures (attract screens, marquees, crtGlass,
  // smpte, timecode, coneFalloff) it has little or no effect, but it is harmless, so the value is uniform and easy to test.
  tex.anisotropy = TEXTURE_ANISOTROPY
  const wrap = options.wrap === 'repeat' ? RepeatWrapping : ClampToEdgeWrapping
  tex.wrapS = wrap
  tex.wrapT = wrap
  if (options.repeat) tex.repeat.set(options.repeat[0], options.repeat[1])
  tex.needsUpdate = true
  surfaces.set(tex, { ctx, width, height })
  registry.push(tex)
  return tex
}

/** The canvas context and size each texture was drawn with, kept so an attract screen can be redrawn in place (task 29.2). */
const surfaces = new WeakMap<CanvasTexture, { ctx: Ctx2D; width: number; height: number }>()

/**
 * Redraws the three attract screen canvases in place at `elapsedSec` and flags their textures for upload (task 29.2).
 * Reuses the canvas and context each texture was created with: no canvas, texture or material is created here.
 * A no-op for a texture that does not exist (no canvas support, or after disposeSharedResources()).
 */
export function updateAnimatedAttractTextures(elapsedSec: number): void {
  for (const id of ATTRACT_TEXTURE_IDS) {
    const tex = cache.get(id)
    const surface = tex ? surfaces.get(tex) : undefined
    if (!tex || !surface) continue
    surface.ctx.clearRect(0, 0, surface.width, surface.height)
    ATTRACT_FRAME_DRAWERS[id](surface.ctx, surface.width, surface.height, elapsedSec)
    tex.needsUpdate = true
  }
}

function repeatFor(id: TextureId): readonly [number, number] | undefined {
  if (id !== 'floor') return undefined
  const b = ROOM.bounds
  return [(b.maxX - b.minX) / FLOOR_METRES_PER_REPEAT, (b.maxZ - b.minZ) / FLOOR_METRES_PER_REPEAT]
}

/** Lazily creates texture `id` once. Null when the environment has no canvas. */
export function getSharedTexture(id: TextureId): CanvasTexture | null {
  if (cache.has(id)) return cache.get(id) ?? null
  const spec = TEXTURE_SPECS[id]
  const tex = createCanvasTexture(spec.width, spec.height, (c, w, h) => spec.draw(c, w, h, spec.seed), {
    filter: spec.filter,
    wrap: spec.wrap,
    repeat: repeatFor(id),
  })
  cache.set(id, tex)
  return tex
}

/** True when the textured look is available (used to keep the box-letter sign only as a fallback). */
export const hasSharedTexture = (id: TextureId): boolean => getSharedTexture(id) !== null

interface TextureBinding {
  material: keyof typeof materials
  texture: TextureId
  /** Colour multiplier once textured. Omitted for materials whose colour the Memory_Shift driver owns. */
  color?: string
  /** Flat colour restored when the texture is disposed (the screens switch to white while textured). */
  fallbackColor?: string
}

/** Which texture each shared material shows. Textured materials multiply the map by `color`. */
const TEXTURE_BINDINGS: readonly TextureBinding[] = [
  { material: 'arcadeScreenSnake', texture: 'attractSnake', color: arcadeScreenBaseColor('snake', true), fallbackColor: arcadeScreenBaseColor('snake', false) },
  { material: 'arcadeScreenMaze', texture: 'attractMaze', color: arcadeScreenBaseColor('maze', true), fallbackColor: arcadeScreenBaseColor('maze', false) },
  { material: 'arcadeScreenFrequency', texture: 'attractFrequency', color: arcadeScreenBaseColor('frequency', true), fallbackColor: arcadeScreenBaseColor('frequency', false) },
  { material: 'marqueeSnake', texture: 'marqueeSnake', color: '#ffffff', fallbackColor: '#1fa855' },
  { material: 'marqueeMaze', texture: 'marqueeMaze', color: '#ffffff', fallbackColor: '#c8203c' },
  { material: 'marqueeFrequency', texture: 'marqueeFrequency', color: '#ffffff', fallbackColor: '#16b8d4' },
  { material: 'signFace', texture: 'signFace', color: '#ffffff' },
  { material: 'posterSunset', texture: 'posterSunset', color: '#ffffff' },
  { material: 'posterReel', texture: 'posterReel', color: '#ffffff' },
  { material: 'shiftPoster', texture: 'shiftPoster', color: '#ffffff' },
  { material: 'shiftPlaque', texture: 'shiftPlaque', color: '#ffffff' },
  { material: 'floor', texture: 'floor', color: '#ffffff' },
  { material: 'wood', texture: 'wood', color: '#ffffff' },
  { material: 'woodDark', texture: 'woodDark', color: '#ffffff' },
  { material: 'crate', texture: 'crate', color: '#ffffff', fallbackColor: '#8a6a3c' },
  { material: 'cardboard', texture: 'crate', color: '#ffffff', fallbackColor: '#a98457' },
  { material: 'crateWood', texture: 'wood', color: '#ffffff', fallbackColor: '#8a6a3c' },
  { material: 'crateSlat', texture: 'wood', color: '#b09878', fallbackColor: '#6e5230' },
  { material: 'grille', texture: 'grille', color: '#ffffff' },
  { material: 'bookSpine', texture: 'spineAtlas', color: '#ffffff' },
  /** The wall colour stays a near-white multiplier owned by Memory_Shift, so no `color` here. */
  { material: 'wall', texture: 'wallPanel' },
  { material: 'couchBody', texture: 'couchFabric', color: COUCH_FABRIC_COLORS.couchBody.textured, fallbackColor: COUCH_FABRIC_COLORS.couchBody.flat },
  { material: 'couchCushion', texture: 'couchFabric', color: COUCH_FABRIC_COLORS.couchCushion.textured, fallbackColor: COUCH_FABRIC_COLORS.couchCushion.flat },
  { material: 'couchPillow', texture: 'couchFabric', color: COUCH_FABRIC_COLORS.couchPillow.textured, fallbackColor: COUCH_FABRIC_COLORS.couchPillow.flat },
  { material: 'armchairBody', texture: 'couchFabric', color: COUCH_FABRIC_COLORS.armchairBody.textured, fallbackColor: COUCH_FABRIC_COLORS.armchairBody.flat },
  { material: 'armchairCushion', texture: 'couchFabric', color: COUCH_FABRIC_COLORS.armchairCushion.textured, fallbackColor: COUCH_FABRIC_COLORS.armchairCushion.flat },
  { material: 'crtCasing', texture: 'crtCasing', color: CRT_CASING_COLORS.textured, fallbackColor: CRT_CASING_COLORS.flat },
  { material: 'vcrDeck', texture: 'vcrDeck', color: '#ffffff', fallbackColor: VCR_CHASSIS_COLOR },
  /** The cabinet texture is light neutral grey; each multiplier is the old flat grey lifted about 15 %, so the lit result stays close to it. */
  { material: 'filingGrey', texture: 'metalCabinet', color: '#808996', fallbackColor: '#6f7782' },
  { material: 'filingDark', texture: 'metalCabinet', color: '#666e7b', fallbackColor: '#59606b' },
  { material: 'filingGreyB', texture: 'metalCabinet', color: '#8c9081', fallbackColor: '#7a7d70' },
  { material: 'filingDarkB', texture: 'metalCabinet', color: '#747865', fallbackColor: '#656858' },
  { material: 'filingCard', texture: 'metalCabinet', color: '#ffffff', fallbackColor: '#d8d2b8' },
  /** The shell texture is light neutral plastic; the multiplier sets black or navy and keeps a little detail contrast. */
  { material: 'tapeBlack', texture: 'vhsShell', color: '#303038', fallbackColor: '#15151a' },
  { material: 'tapeBlue', texture: 'vhsShell', color: '#4476f8', fallbackColor: '#2a4aa0' },
  /** The glass texture carries the look, so the multiplier is white; Memory_Shift tints it from there. */
  { material: 'crtScreen', texture: 'crtGlass', color: crtScreenBaseColor(true), fallbackColor: crtScreenBaseColor(false) },
  { material: 'rugWoven', texture: 'rugWoven', color: '#ffffff' },
  { material: 'cork', texture: 'corkBoard', color: '#ffffff' },
  { material: 'paper', texture: 'deskDetail', color: '#ffffff', fallbackColor: '#e6dfc6' },
  { material: 'notebookCover', texture: 'deskDetail', color: '#6a7888', fallbackColor: '#4a5866' },
  { material: 'lampConeBanker', texture: 'coneFalloff', color: '#8fd65a', fallbackColor: '#8fd65a' },
  { material: 'lampConeTable', texture: 'coneFalloff', color: '#ffa63c', fallbackColor: '#ffa63c' },
  { material: 'lampHalo', texture: 'lampGlow', color: '#ffffff' },
  { material: 'lampPool', texture: 'lampGlow', color: '#ffa63c' },
  { material: 'lampPoolBanker', texture: 'lampGlow', color: '#a6d65a' },
  { material: 'ceilingBloom', texture: 'lampGlow', color: '#cfe4ff' },
  { material: 'arcadeGlowSnake', texture: 'lampGlow', color: '#22c55e' },
  { material: 'arcadeGlowMaze', texture: 'lampGlow', color: '#e11d48' },
  { material: 'arcadeGlowFrequency', texture: 'lampGlow', color: '#f59e0b' },
  /** Slightly dimmed multiplier: the reference card stays below the main CRT's brightness. */
  { material: 'smpteScreen', texture: 'smpteBars', color: '#b8b8b8' },
  { material: 'timecode', texture: 'timecode', color: '#ffffff' },
  /** 27.1: the cabinetAndManualDetail texture is the colour of the coin door, kick plate, control-deck lip and the three manual spines (white multiplier; books multiply it by the instance colour). */
  { material: 'cabinetPanel', texture: 'cabinetAndManualDetail', color: '#ffffff', fallbackColor: '#777c86' },
  { material: 'deckPlate', texture: 'cabinetAndManualDetail', color: '#ffffff', fallbackColor: '#1a1b22' },
  { material: 'manualBook', texture: 'cabinetAndManualDetail', color: '#ffffff', fallbackColor: '#ffffff' },
]

/**
 * Creates the textures (once) and attaches them to their materials. Idempotent and safe to call from
 * render: after disposeSharedResources() the next call rebuilds the textures. With no canvas support
 * nothing changes and every material keeps its flat colour.
 */
export function ensureSharedTextures(): void {
  for (const b of TEXTURE_BINDINGS) {
    const tex = getSharedTexture(b.texture)
    const mat = materials[b.material]
    if (!tex || mat.map === tex) continue
    mat.map = tex
    if (b.color) mat.color.set(b.color)
    mat.needsUpdate = true
  }
}

/** Number of live (created, not disposed) textures. */
export const liveTextureCount = (): number => registry.length

/** Test hook: replaces the canvas source (null restores the default) and drops existing textures. */
export function setCanvasFactory(factory: CanvasFactory | null): void {
  disposeTextures()
  canvasFactory = factory ?? defaultCanvasFactory
}

function disposeTextures(): void {
  for (const b of TEXTURE_BINDINGS) {
    const mat = materials[b.material]
    if (mat.map) {
      mat.map = null
      if (b.fallbackColor) mat.color.set(b.fallbackColor)
      mat.needsUpdate = true
    }
  }
  for (const t of registry) t.dispose()
  registry.length = 0
  cache.clear()
}

/** Every texture id, for tests and docs. */
export const SHARED_TEXTURE_IDS: readonly TextureId[] = TEXTURE_IDS

/** Disposes every shared geometry, material and texture. Call on scene unmount. Safe to call twice. */
export function disposeSharedResources(): void {
  for (const g of Object.values(geometries)) g.dispose()
  for (const g of spineGeometries) g.dispose()
  for (const g of Object.values(manualGeometries)) g.dispose()
  for (const g of wallGeometryCache.values()) g.dispose()
  wallGeometryCache.clear()
  for (const g of woodBoxCache.values()) g.dispose()
  woodBoxCache.clear()
  for (const m of Object.values(materials)) m.dispose()
  disposeTextures()
}
