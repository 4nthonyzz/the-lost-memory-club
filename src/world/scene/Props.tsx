/** Reception desk, bookcases with instanced books and tapes, furniture and environmental details. Sizes come from ROOM props. */
import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { AssetModel } from '../assets/AssetModel'
import { ROOM, type PropDef } from '../layout/roomLayout'
import type { Aabb, Facing } from '../worldTypes'
import {
  ARCHIVE_BOX_IDS,
  archiveBoxParts,
  arcadeFloorGlowParts,
  arcadeFloorParts,
  armchairParts,
  couchParts,
  crateParts,
  crtStackParts,
  DESK_LAMPS,
  deskLampParts,
  deskLampPlacement,
  deskParts,
  type DeskLampKind,
  type Part,
  advancePlatterAngle,
  posterParts,
  hifiTableGroups,
  speakerParts,
  shelfFrameParts,
  shelfContents,
} from './modelDetail'
import { useReducedMotion } from '../controller/useReducedMotion'
import { assetPlacement } from './assetPlacement'
import { backAgainstWall } from './floorCull'
import { BookMeshes, PartMeshes } from './PartMeshes'
import { Block } from './Room'
import { ensureSharedTextures, geometries, hasSharedTexture, materials, metricBoxGeometry } from './sharedResources'
import { Faced } from './Stations'

function propById(id: string): PropDef {
  const p = ROOM.props.find((q) => q.id === id)
  if (!p) throw new Error(`Missing prop ${id}`)
  return p
}

const DESK_TOP = propById('reception-desk').height

export function Desk({ box, height }: { box: Aabb; height: number }) {
  const parts = useMemo(() => deskParts(box, height), [box, height])
  return <PartMeshes parts={parts} />
}

/**
 * A round glow disc that always faces the camera (task 30.1): the shared 24-segment unit disc with the shared halo material.
 * Copying the camera quaternion keeps the disc parallel to the screen, so it never reads as a tilted shape; the lampGlow texture is alpha 0
 * from 90 % of its radius outward, so the rim of the disc is invisible. Only the banker lamp has a sprite (the table lamp has none).
 */
function GlowSprite({ part }: { part: Part }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ camera }) => {
    ref.current?.quaternion.copy(camera.quaternion)
  })
  return (
    <mesh
      ref={ref}
      geometry={geometries[part.geo]}
      material={materials[part.mat]}
      position={[part.pos[0], part.pos[1], part.pos[2]]}
      scale={[part.scale[0], part.scale[1], part.scale[2]]}
      renderOrder={2}
    />
  )
}

/**
 * One desk lamp (task 23.1), placed from its layout entry. `on` selects the lit or unlit shared materials per
 * mesh: lit = bulb core, warm inner shade, additive glow sprite and desk light pool; unlit = dark glass, no
 * sprite, no pool. There is no light source; the glow is only meshes, so the two lamps never affect each other.
 */
export function DeskLamp({ id, kind, on = true }: { id: string; kind: DeskLampKind; on?: boolean }) {
  const parts = useMemo(() => {
    const { box, top } = deskLampPlacement(id)
    return deskLampParts(box, kind, on, top)
  }, [id, kind, on])
  const textured = useMemo(() => {
    ensureSharedTextures()
    return hasSharedTexture('lampGlow')
  }, [])
  // Without the glow texture the additive sprite and pool would be flat blobs, so they are skipped.
  const solid = useMemo(() => parts.filter((p) => p.lampRole !== 'sprite' && (textured || p.lampRole !== 'pool')), [parts, textured])
  const sprite = textured ? parts.find((p) => p.lampRole === 'sprite') : undefined
  return (
    <group>
      <PartMeshes parts={solid} />
      {sprite ? <GlowSprite part={sprite} /> : null}
    </group>
  )
}

/** Both desk lamps. Each lamp's `on` state comes from the world-local prop state (task 23.2). */
export function DeskLamps({ on = {} }: { on?: Readonly<Record<string, boolean>> }) {
  return (
    <group>
      {DESK_LAMPS.map(({ id, kind }) => (
        <DeskLamp key={id} id={id} kind={kind} on={on[id] ?? true} />
      ))}
    </group>
  )
}

/**
 * Solid wood bookcase (carcass parts and the cardboard tape boxes) plus the books and VHS slipcases as
 * instanced meshes with per-instance colour (task 18.2). Contents are pure seeded data from shelfModel.ts.
 */
export function Shelf({ id, box, height }: { id: string; box: Aabb; height: number }) {
  const { parts, instances } = useMemo(() => {
    const contents = shelfContents(id, box, height)
    return { parts: [...shelfFrameParts(box, height), ...contents.boxParts], instances: contents.instances }
  }, [id, box, height])
  return (
    <group>
      <PartMeshes parts={parts} />
      <BookMeshes instances={instances} />
    </group>
  )
}

export function Armchair({ box }: { box: Aabb }) {
  const parts = useMemo(() => armchairParts(box), [box])
  return <PartMeshes parts={parts} />
}

export function Couch({ box }: { box: Aabb }) {
  const parts = useMemo(() => couchParts(box), [box])
  return <PartMeshes parts={parts} />
}

/**
 * The two-tier Hi-Fi console body (tasks 33.1, 34.1, 35.1), in the prop-local frame. Three separately addressable groups: the static console (steel posts, walnut top and shelf,
 * turntable controls and open dust cover, NOW PLAYING jacket stand, cassettes, brass lamp, LP rack, receiver, record crate, front LED bar and tabletop glow), the platter group (placed at the spindle axis, so rotating
 * it about y spins the record) and the tonearm. While `playing` the platter spins at 33 1/3 RPM in useFrame (TURNTABLE_SPIN_RAD_PER_SEC), the tonearm sits
 * on the record, the display is emerald, the LED bar is bright and the glow is stronger; stopped, the tonearm rests on its cradle, the display is amber and the
 * LED and glow are dim. `track` selects the jacket colour (0..3 = the four records, anything else = neutral STOP). Under reduced motion nothing spins; the
 * pose still switches instantly. There is no invalidate loop: the frame loop is the existing one (it is idle in 'demand' mode while a station panel is
 * open, so the spin pauses there too). Without the lampGlow texture the additive glow disc would be a flat blob, so it is skipped.
 */
function HifiTable({ box, playing, track, wallBack, platterRef }: { box: Aabb; playing: boolean; track: number; wallBack: boolean; platterRef?: RefObject<Group | null> }) {
  const groups = useMemo(() => hifiTableGroups(box, { playing, track }, wallBack), [box, playing, track, wallBack])
  const textured = useMemo(() => {
    ensureSharedTextures()
    return hasSharedTexture('lampGlow')
  }, [])
  const solid = useMemo(() => (textured ? groups.static : groups.static.filter((p) => p.hifiRole !== 'glow')), [groups, textured])
  const own = useRef<Group>(null)
  const ref = platterRef ?? own
  const reduced = useReducedMotion()
  useFrame((_, dt) => {
    const g = ref.current
    if (g) g.rotation.y = advancePlatterAngle(g.rotation.y, dt, playing, reduced)
  })
  return (
    <group>
      <PartMeshes parts={solid} />
      <group ref={ref} position={[groups.spindle[0], groups.spindle[1], groups.spindle[2]]}>
        <PartMeshes parts={groups.platter} />
      </group>
      <PartMeshes parts={groups.tonearm} />
    </group>
  )
}

/** The record player on its layout footprint: the Hi-Fi console faces `facing` (-z for the south-wall spot, 34.1). `track` defaults to 4 (neutral jacket). */
export function RecordPlayer({
  box,
  facing,
  playing = false,
  track = 4,
  platterRef,
}: {
  box: Aabb
  facing?: Facing
  playing?: boolean
  track?: number
  platterRef?: RefObject<Group | null>
}) {
  const wallBack = useMemo(() => backAgainstWall(box, facing, ROOM.walls), [box, facing])
  return (
    <Faced box={box} facing={facing}>
      {(local) => <HifiTable box={local} playing={playing} track={track} wallBack={wallBack} platterRef={platterRef} />}
    </Faced>
  )
}

/** The floor loudspeaker (task 35.1) beside the console, on its layout footprint, facing -z. Static: it never animates. */
export function Loudspeaker({ box, height, facing }: { box: Aabb; height: number; facing?: Facing }) {
  const wallBack = useMemo(() => backAgainstWall(box, facing, ROOM.walls), [box, facing])
  return (
    <Faced box={box} facing={facing}>{(local) => <PartMeshes parts={speakerParts(local, height, wallBack)} />}</Faced>
  )
}

export function Crate({ box, height }: { box: Aabb; height: number }) {
  const parts = useMemo(() => crateParts(box, height), [box, height])
  return <PartMeshes parts={parts} />
}
function Details() {
  const crateA = propById('crate-a')
  const crateB = propById('crate-b')
  const stack = propById('tape-stack')
  const cable = propById('cable-run')
  const rug = propById('rug')
  const archiveBoxes = useMemo(
    () => ARCHIVE_BOX_IDS.map((id) => ({ id, parts: archiveBoxParts(propById(id).box, propById(id).height) })),
    [],
  )
  const sx = (stack.box.minX + stack.box.maxX) / 2
  const sz = (stack.box.minZ + stack.box.maxZ) / 2
  const posters = useMemo(posterParts, [])
  // Real-size cassette box with metric UVs (one vhsShell tile spans the cassette length), shared by the three tapes.
  const stackW = stack.box.maxX - stack.box.minX
  const stackD = stack.box.maxZ - stack.box.minZ
  const tapeGeometry = useMemo(() => metricBoxGeometry(stackW, 0.04, stackD, stackW), [stackW, stackD])
  return (
    <group>
      {/* Rug decal under the island, from the layout */}
      <mesh
        geometry={geometries.plane}
        material={materials.rugWoven}
        position={[(rug.box.minX + rug.box.maxX) / 2, rug.elevation ?? 0.01, (rug.box.minZ + rug.box.maxZ) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[rug.box.maxX - rug.box.minX, rug.box.maxZ - rug.box.minZ, 1]}
      />
      {/* Archival tape boxes in the corners (visual only) */}
      {archiveBoxes.map((b) => (
        <PartMeshes key={b.id} parts={b.parts} />
      ))}
      {[crateA, crateB].map((c) => (
        <AssetModel key={c.id} id={c.id} {...assetPlacement(c.box)} fallback={<Crate box={c.box} height={c.height} />} />
      ))}
      {/* Tape stack on the reception desk top */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          geometry={tapeGeometry}
          material={materials.tapeBlack}
          position={[sx, DESK_TOP + 0.02 + i * 0.05, sz]}
        />
      ))}
      {/* Framed posters: textured planes inside four-piece wooden frames */}
      <PartMeshes parts={posters} />
      {/* Cable run on the floor */}
      <Block box={cable.box} y0={0.005} h={cable.height} material={materials.plastic} />
    </group>
  )
}

/**
 * Memory_Shift set dressing: an extra poster on the north wall and an altered plaque on the
 * south wall. Visual only (no Collider, no layout entry). Materials are transparent and
 * hidden until the shift blend starts.
 */
function ShiftDressing() {
  return (
    <group>
      <mesh geometry={geometries.plane} material={materials.shiftPoster} position={[-0.3, 1.7, -3.94]} scale={[0.6, 1.2, 1]} />
      <mesh geometry={geometries.plane} material={materials.shiftPlaque} position={[0.8, 1.7, 3.99]} rotation={[0, Math.PI, 0]} scale={[0.6, 0.3, 1]} />
    </group>
  )
}

/**
 * Arcade dressing (task 15.6, updated in 20.1): stacked CRT monitors (now in the main room's north-east
 * corner), a floor runner decal and cable runs. The three cabinets are drawn by Stations.tsx. Solid pieces get
 * their Colliders from the layout; nothing here is interactive and nothing animates.
 */
function CrtStack({ box, height }: { box: Aabb; height: number }) {
  const parts = useMemo(() => crtStackParts(box, height), [box, height])
  return <PartMeshes parts={parts} />
}

function ArcadeAreaDressing() {
  const stack = propById('crt-stack')
  const floor = useMemo(arcadeFloorParts, [])
  // Task 25.2: static additive floor glows. Without the glow texture they would be flat tinted squares, so they are skipped.
  const glows = useMemo(() => {
    ensureSharedTextures()
    return hasSharedTexture('lampGlow') ? arcadeFloorGlowParts() : []
  }, [])
  return (
    <group>
      <Faced box={stack.box} facing={stack.facing}>
        {(local) => <CrtStack box={local} height={stack.height} />}
      </Faced>
      <PartMeshes parts={floor} />
      <PartMeshes parts={glows} />
    </group>
  )
}

/**
 * `lampOn` is the world-local lamp state (task 23.2). Absent means both lamps are on. `turntablePlaying` is true while a music track really plays (task 33.3).
 * `turntableTrack` (task 34.2) is the selected track 0..4 mirrored from the audio engine: the NOW PLAYING jacket shows its colour as soon as it is selected,
 * even before audio is unlocked (the LED, glow, display and tonearm stay tied to `turntablePlaying`); 4 (STOP) and the default show the neutral jacket.
 */
export function Props({
  lampOn,
  turntablePlaying = false,
  turntableTrack = 4,
}: { lampOn?: Readonly<Record<string, boolean>>; turntablePlaying?: boolean; turntableTrack?: number } = {}) {
  const desk = propById('reception-desk')
  const chair = propById('abandoned-chair')
  const couch = propById('couch')
  const recordPlayer = propById('record-player')
  const loudspeaker = propById('loudspeaker')
  return (
    <group>
      <ShiftDressing />
      <Desk box={desk.box} height={desk.height} />
      <DeskLamps on={lampOn} />
      {(['shelf-a', 'shelf-b', 'shelf-c'] as const).map((id) => {
        const s = propById(id)
        // The shelf GLB is authored along X; assetPlacement rotates it 90 degrees for the Z-long west shelves.
        return (
          <AssetModel key={id} id={id} {...assetPlacement(s.box)} fallback={<Shelf id={id} box={s.box} height={s.height} />} />
        )
      })}
      <AssetModel id="armchair" {...assetPlacement(chair.box)} fallback={<Armchair box={chair.box} />} />
      <AssetModel id="couch" {...assetPlacement(couch.box)} fallback={<Couch box={couch.box} />} />
      <RecordPlayer box={recordPlayer.box} facing={recordPlayer.facing} playing={turntablePlaying} track={turntableTrack} />
      <Loudspeaker box={loudspeaker.box} height={loudspeaker.height} facing={loudspeaker.facing} />
      <Details />
      <ArcadeAreaDressing />
    </group>
  )
}
